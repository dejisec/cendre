use std::net::SocketAddr;
use std::sync::Arc;

use axum::{
    Json, Router,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, StatusCode},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod db;
mod models;

use crate::db::{InMemorySecretStore, RedisSecretStore, SecretStore, StorageError};

type SharedSecretStore = Arc<dyn SecretStore>;

#[derive(Clone)]
struct AppState {
    store: SharedSecretStore,
}

#[tokio::main]
async fn main() {
    init_tracing();

    let state = build_state().await;

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/secrets", post(create_secret))
        .route("/api/secret/:id", get(get_secret))
        .with_state(state);

    let addr: SocketAddr = std::env::var("BACKEND_BIND_ADDR")
        .unwrap_or_else(|_| "0.0.0.0:8080".to_string())
        .parse()
        .expect("invalid BACKEND_BIND_ADDR");

    tracing::info!("listening on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("failed to bind TCP listener");

    axum::serve(listener, app).await.expect("server error");
}

async fn build_state() -> AppState {
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

fn init_tracing() {
    let env_filter = std::env::var("RUST_LOG")
        .unwrap_or_else(|_| "cendre_backend=info,tower_http=info".to_string());

    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(env_filter))
        .with(tracing_subscriber::fmt::layer())
        .init();
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

    Ok(ApiResponse(Json(CreateSecretResponse { id: secret.id })))
}

async fn get_secret(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> Result<ApiResponse<Json<SecretResponse>>, ApiError> {
    let maybe_secret = state.store.get_and_delete_secret(&id).await?;

    match maybe_secret {
        Some(secret) => Ok(ApiResponse(Json(SecretResponse {
            id: secret.id,
            ciphertext: secret.ciphertext,
            iv: secret.iv,
            ttl_secs: secret.ttl_secs,
        }))),
        None => Err(ApiError::NotFound),
    }
}
