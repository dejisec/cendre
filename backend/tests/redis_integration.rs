use std::env;
use std::time::Duration as StdDuration;

use cendre_backend::db::{RedisSecretStore, SecretStore};
use tokio::time::sleep;

fn redis_url_from_env() -> Option<String> {
    env::var("REDIS_URL")
        .ok()
        .or_else(|| env::var("TEST_REDIS_URL").ok())
}

async fn create_store() -> Option<RedisSecretStore> {
    let url = match redis_url_from_env() {
        Some(url) => url,
        None => {
            eprintln!("REDIS_URL or TEST_REDIS_URL not set; skipping Redis integration tests");
            return None;
        }
    };

    match RedisSecretStore::new(&url).await {
        Ok(store) => Some(store),
        Err(err) => {
            eprintln!(
                "Failed to connect to Redis at {}: {:?}; skipping tests",
                url, err
            );
            None
        }
    }
}

#[tokio::test]
async fn store_secret_allows_read_before_expiry() {
    let store = match create_store().await {
        Some(store) => store,
        None => return,
    };

    let ttl_secs = 10;
    let created = store
        .store_secret("ciphertext".into(), "iv".into(), ttl_secs)
        .await
        .expect("store_secret should succeed against Redis");

    let fetched = store
        .get_and_delete_secret(&created.id)
        .await
        .expect("get_and_delete_secret should succeed")
        .expect("secret should exist before expiry");

    assert_eq!(fetched.id, created.id);
    assert_eq!(fetched.ciphertext, created.ciphertext);
    assert_eq!(fetched.iv, created.iv);
    assert_eq!(fetched.ttl_secs, created.ttl_secs);
}

#[tokio::test]
async fn get_and_delete_secret_is_one_time_with_redis() {
    let store = match create_store().await {
        Some(store) => store,
        None => return,
    };

    let created = store
        .store_secret("ciphertext".into(), "iv".into(), 60)
        .await
        .expect("store_secret should succeed");

    let first = store
        .get_and_delete_secret(&created.id)
        .await
        .expect("first get_and_delete_secret should succeed");
    assert!(first.is_some(), "first read should return the secret");

    let second = store
        .get_and_delete_secret(&created.id)
        .await
        .expect("second get_and_delete_secret should also succeed");
    assert!(
        second.is_none(),
        "second read should not find the secret after deletion"
    );
}

#[tokio::test]
async fn secrets_expire_after_ttl() {
    let store = match create_store().await {
        Some(store) => store,
        None => return,
    };

    let ttl_secs = 2u32;

    let created = store
        .store_secret("ciphertext".into(), "iv".into(), ttl_secs)
        .await
        .expect("store_secret should succeed");

    // Wait for the key to expire in Redis (with a small safety margin).
    sleep(StdDuration::from_secs(ttl_secs as u64 + 2)).await;

    let fetched = store
        .get_and_delete_secret(&created.id)
        .await
        .expect("get_and_delete_secret should succeed after ttl");

    assert!(
        fetched.is_none(),
        "secret should no longer be available after TTL has elapsed"
    );
}
