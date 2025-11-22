pub mod db;
pub mod models;

use std::collections::HashMap;
use std::net::SocketAddr;
use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::{
    Json, Router,
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, Request, StatusCode},
    middleware::Next,
    response::IntoResponse,
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::db::{InMemorySecretStore, RedisSecretStore, SecretStore, StorageError};

type SharedSecretStore = Arc<dyn SecretStore>;

#[derive(Clone)]
struct AppState {
    store: SharedSecretStore,
}

#[derive(Clone)]
struct RateLimiter {
    max_requests_per_window: u32,
    window: Duration,
    buckets: Arc<tokio::sync::Mutex<HashMap<String, RateBucket>>>,
}

#[derive(Clone, Copy)]
struct RateBucket {
    window_start: Instant,
    count: u32,
}

impl RateLimiter {
    fn new(max_requests_per_window: u32, window: Duration) -> Self {
        Self {
            max_requests_per_window,
            window,
            buckets: Arc::new(tokio::sync::Mutex::new(HashMap::new())),
        }
    }

    async fn check(&self, identity: &str) -> bool {
        let mut buckets = self.buckets.lock().await;
        let now = Instant::now();

        let bucket = buckets.entry(identity.to_string()).or_insert(RateBucket {
            window_start: now,
            count: 0,
        });

        if now.duration_since(bucket.window_start) > self.window {
            bucket.window_start = now;
            bucket.count = 0;
        }

        if bucket.count >= self.max_requests_per_window {
            return false;
        }

        bucket.count += 1;
        true
    }
}

/// Build an `axum::Router` instance wired up with an in-memory `SecretStore`.
///
/// This is primarily intended for tests and local development where a Redis
/// instance is not required.
pub fn app_router_with_in_memory_store() -> Router {
    let state = AppState {
        store: Arc::new(InMemorySecretStore::new()),
    };
    app_router_with_state(state)
}

/// Build an `axum::Router` instance using configuration from the environment.
///
/// If `REDIS_URL` is set and Redis can be reached, a `RedisSecretStore` will be
/// used. Otherwise the application will fall back to an in-memory store.
pub async fn app_router_from_env() -> Router {
    let state = build_state_from_env().await;
    app_router_with_state(state)
}

fn app_router_with_state(state: AppState) -> Router {
    // Allow a modest number of requests per client per minute. This is not meant
    // to be bulletproof abuse protection, just a first line of defence that can
    // be tightened or replaced later.
    let rate_limiter = RateLimiter::new(60, Duration::from_secs(60));

    Router::new()
        .route("/health", get(health_check))
        .route("/api/secrets", post(create_secret))
        .route("/api/secret/:id", get(get_secret))
        .route_layer(axum::middleware::from_fn_with_state(
            rate_limiter,
            rate_limit_middleware,
        ))
        .with_state(state)
}

async fn build_state_from_env() -> AppState {
    // Prefer Redis when REDIS_URL is configured; otherwise fall back to in-memory storage.
    if let Ok(url) = std::env::var("REDIS_URL") {
        match RedisSecretStore::new(&url).await {
            Ok(store) => {
                tracing::info!("Using RedisSecretStore as backing store");
                return AppState {
                    store: Arc::new(store),
                };
            }
            Err(err) => {
                tracing::warn!(
                    "Failed to initialize RedisSecretStore ({}); falling back to in-memory store",
                    format!("{:?}", err)
                );
            }
        }
    } else {
        tracing::info!("REDIS_URL not set; using in-memory secret store");
    }

    AppState {
        store: Arc::new(InMemorySecretStore::new()),
    }
}

/// Initialise tracing subscribers for the backend.
///
/// This is used by the binary entrypoint as well as by integration tests that
/// want to capture logs.
pub fn init_tracing() {
    let env_filter = std::env::var("RUST_LOG")
        .unwrap_or_else(|_| "cendre_backend=info,tower_http=info".to_string());

    let _ = tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(env_filter))
        .with(tracing_subscriber::fmt::layer())
        .try_init();
}

/// Simple wrapper that ensures our standard security headers are applied to every response.
struct ApiResponse<T>(T);

impl<T> From<T> for ApiResponse<T> {
    fn from(inner: T) -> Self {
        Self(inner)
    }
}

impl<T> axum::response::IntoResponse for ApiResponse<T>
where
    T: axum::response::IntoResponse,
{
    fn into_response(self) -> axum::response::Response {
        let mut response = self.0.into_response();
        apply_security_headers(response.headers_mut());
        response
    }
}

fn apply_security_headers(headers: &mut HeaderMap) {
    // These headers are safe defaults for an API-only backend.
    headers.insert(
        "X-Content-Type-Options",
        HeaderValue::from_static("nosniff"),
    );
    headers.insert("X-Frame-Options", HeaderValue::from_static("DENY"));
    headers.insert("Referrer-Policy", HeaderValue::from_static("no-referrer"));
    headers.insert(
        "Strict-Transport-Security",
        HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"),
    );
}

fn rate_limit_identity(req: &Request<Body>) -> String {
    if let Some(addr) = req.extensions().get::<SocketAddr>() {
        return addr.ip().to_string();
    }

    "global".to_string()
}

async fn rate_limit_middleware(
    State(rate_limiter): State<RateLimiter>,
    req: Request<Body>,
    next: Next,
) -> axum::response::Response {
    let identity = rate_limit_identity(&req);

    let allowed = rate_limiter.check(&identity).await;

    if !allowed {
        tracing::warn!(client = %identity, "rate limit exceeded");

        let body = Json(ErrorBody {
            error: "too many requests".to_string(),
        });
        let mut response = body.into_response();
        *response.status_mut() = StatusCode::TOO_MANY_REQUESTS;
        apply_security_headers(response.headers_mut());
        response
    } else {
        next.run(req).await
    }
}

#[derive(Debug)]
enum ApiError {
    BadRequest(&'static str),
    NotFound,
    Storage(StorageError),
    Internal(String),
}

impl From<StorageError> for ApiError {
    fn from(err: StorageError) -> Self {
        ApiError::Storage(err)
    }
}

#[derive(Serialize)]
struct ErrorBody {
    error: String,
}

impl axum::response::IntoResponse for ApiError {
    fn into_response(self) -> axum::response::Response {
        let (status, message) = match self {
            ApiError::BadRequest(msg) => (StatusCode::BAD_REQUEST, msg.to_string()),
            ApiError::NotFound => (StatusCode::NOT_FOUND, "secret not found".to_string()),
            ApiError::Storage(err) => {
                tracing::error!("storage error: {:?}", err);
                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "internal storage error".to_string(),
                )
            }
            ApiError::Internal(msg) => {
                tracing::error!("internal error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, msg)
            }
        };

        let body = Json(ErrorBody { error: message });
        let mut response = body.into_response();
        *response.status_mut() = status;
        apply_security_headers(response.headers_mut());
        response
    }
}

#[derive(Deserialize)]
struct CreateSecretRequest {
    ciphertext: String,
    iv: String,
    ttl_secs: u32,
}

#[derive(Serialize)]
struct CreateSecretResponse {
    id: String,
}

#[derive(Serialize)]
struct SecretResponse {
    id: String,
    ciphertext: String,
    iv: String,
    ttl_secs: u32,
}

async fn health_check() -> ApiResponse<&'static str> {
    ApiResponse("ok")
}

async fn create_secret(
    State(state): State<AppState>,
    Json(payload): Json<CreateSecretRequest>,
) -> Result<ApiResponse<Json<CreateSecretResponse>>, ApiError> {
    if payload.ciphertext.trim().is_empty() || payload.iv.trim().is_empty() {
        return Err(ApiError::BadRequest(
            "ciphertext and iv must be non-empty strings",
        ));
    }

    // Keep TTL within a sane range (1 second up to 24 hours).
    if payload.ttl_secs == 0 || payload.ttl_secs > 24 * 60 * 60 {
        return Err(ApiError::BadRequest(
            "ttl_secs must be between 1 and 86400 seconds",
        ));
    }

    let secret = state
        .store
        .store_secret(payload.ciphertext, payload.iv, payload.ttl_secs)
        .await?;

    tracing::info!(
        secret_id = %secret.id,
        ttl_secs = secret.ttl_secs,
        "created secret"
    );

    Ok(ApiResponse(Json(CreateSecretResponse { id: secret.id })))
}

async fn get_secret(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<ApiResponse<Json<SecretResponse>>, ApiError> {
    let maybe_secret = state.store.get_and_delete_secret(&id).await?;

    match maybe_secret {
        Some(secret) => {
            tracing::info!(secret_id = %secret.id, "read secret");

            Ok(ApiResponse(Json(SecretResponse {
                id: secret.id,
                ciphertext: secret.ciphertext,
                iv: secret.iv,
                ttl_secs: secret.ttl_secs,
            })))
        }
        None => {
            tracing::info!(secret_id = %id, "secret not found");
            Err(ApiError::NotFound)
        }
    }
}
