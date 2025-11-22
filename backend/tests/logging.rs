use std::io::{self, Write};
use std::sync::{Arc, Mutex};

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use cendre_backend::app_router_with_in_memory_store;
use http_body_util::BodyExt;
use serde_json::Value;
use tower::ServiceExt;
use tracing_subscriber::{fmt::MakeWriter, layer::SubscriberExt};

#[derive(Clone)]
struct BufferMakeWriter {
    buffer: Arc<Mutex<String>>,
}

struct BufferWriter {
    buffer: Arc<Mutex<String>>,
}

impl<'a> MakeWriter<'a> for BufferMakeWriter {
    type Writer = BufferWriter;

    fn make_writer(&'a self) -> Self::Writer {
        BufferWriter {
            buffer: self.buffer.clone(),
        }
    }
}

impl Write for BufferWriter {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let s = std::str::from_utf8(buf).unwrap_or_default();
        let mut guard = self
            .buffer
            .lock()
            .expect("log buffer mutex should not be poisoned");
        guard.push_str(s);
        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

#[tokio::test]
async fn logs_do_not_contain_ciphertext_or_iv() {
    let log_buffer = Arc::new(Mutex::new(String::new()));
    let make_writer = BufferMakeWriter {
        buffer: log_buffer.clone(),
    };

    let subscriber = tracing_subscriber::registry().with(
        tracing_subscriber::fmt::layer()
            .with_writer(make_writer)
            .with_ansi(false),
    );

    let _guard = tracing::subscriber::set_default(subscriber);

    let app = app_router_with_in_memory_store();

    let ciphertext = "SUPER_SECRET_CIPHERTEXT_FOR_LOG_TEST";
    let iv = "SUPER_SECRET_IV_FOR_LOG_TEST";

    let payload = serde_json::json!({
        "ciphertext": ciphertext,
        "iv": iv,
        "ttl_secs": 60u32,
    });

    // Create a new secret to trigger logging in the POST handler.
    let create_response = app
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

    assert_eq!(create_response.status(), StatusCode::OK);

    let body_bytes = create_response
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

    // Read the secret once to trigger logging in the GET handler.
    let read_response = app
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/secret/{id}"))
                .body(Body::empty())
                .expect("failed to build request"),
        )
        .await
        .expect("request to router should succeed");

    assert_eq!(read_response.status(), StatusCode::OK);

    let captured = log_buffer
        .lock()
        .expect("log buffer mutex should not be poisoned")
        .clone();

    assert!(
        !captured.contains(ciphertext),
        "logs must not contain ciphertext"
    );
    assert!(!captured.contains(iv), "logs must not contain iv");
}
