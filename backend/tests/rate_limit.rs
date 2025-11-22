use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use cendre_backend::app_router_with_in_memory_store;
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt; // for `oneshot`

#[tokio::test]
async fn excessive_requests_eventually_receive_429() {
    let app = app_router_with_in_memory_store();

    let payload = serde_json::json!({
        "ciphertext": "ciphertext-value",
        "iv": "iv-value",
        "ttl_secs": 60u32,
    });

    // Send a burst of POST requests from the same logical client and assert that
    // at least one of them is rejected with 429.
    let mut rate_limited_response = None;

    for _ in 0..100 {
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

        if response.status() == StatusCode::TOO_MANY_REQUESTS {
            rate_limited_response = Some(response);
            break;
        }
    }

    let response = rate_limited_response.expect("expected at least one 429 response");

    // The rate limiter should return a JSON error body consistent with the rest
    // of the API error handling.
    let body_bytes = response
        .into_body()
        .collect()
        .await
        .expect("body collection should succeed")
        .to_bytes();
    let json: Value =
        serde_json::from_slice(&body_bytes).expect("response body should be valid JSON");

    assert_eq!(
        json.get("error").and_then(|v| v.as_str()),
        Some("too many requests")
    );
}
