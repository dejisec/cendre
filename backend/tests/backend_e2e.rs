use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt; // for `oneshot`

use cendre_backend::app_router_with_in_memory_store;

#[tokio::test]
async fn create_then_read_secret_end_to_end() {
    let app = app_router_with_in_memory_store();

    let payload = serde_json::json!({
        "ciphertext": "ciphertext-value",
        "iv": "iv-value",
        "ttl_secs": 60u32,
    });

    // Create a new secret.
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/secrets")
                .header("content-type", "application/json")
                .body(Body::from(payload.to_string()))
                .expect("failed to build request"),
        )
        .await
        .expect("request to router should succeed");

    assert_eq!(response.status(), StatusCode::OK);

    let body_bytes = response
        .into_body()
        .collect()
        .await
        .expect("body collection should succeed")
        .to_bytes();
    let json: Value =
        serde_json::from_slice(&body_bytes).expect("response body should be valid JSON");

    let id = json
        .get("id")
        .and_then(|v| v.as_str())
        .expect("response should contain an id")
        .to_string();

    // First read: we should get back the ciphertext and iv.
    let first_read = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/secret/{id}"))
                .body(Body::empty())
                .expect("failed to build request"),
        )
        .await
        .expect("request to router should succeed");

    assert_eq!(first_read.status(), StatusCode::OK);

    let first_body_bytes = first_read
        .into_body()
        .collect()
        .await
        .expect("body collection should succeed")
        .to_bytes();
    let first_json: Value =
        serde_json::from_slice(&first_body_bytes).expect("response body should be valid JSON");

    assert_eq!(
        first_json.get("ciphertext").and_then(|v| v.as_str()),
        Some("ciphertext-value")
    );
    assert_eq!(
        first_json.get("iv").and_then(|v| v.as_str()),
        Some("iv-value")
    );

    // Second read: the secret should have been deleted and we should see a 404.
    let second_read = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/secret/{id}"))
                .body(Body::empty())
                .expect("failed to build request"),
        )
        .await
        .expect("request to router should succeed");

    assert_eq!(second_read.status(), StatusCode::NOT_FOUND);
}
