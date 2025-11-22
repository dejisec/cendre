use std::net::SocketAddr;

use axum::Router;

use cendre_backend::{app_router_from_env, init_tracing};

#[tokio::main]
async fn main() {
    init_tracing();

    let app: Router = app_router_from_env().await;

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
