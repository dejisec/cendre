use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use tokio::sync::RwLock;

use crate::models::Secret;

/// Errors that can occur when interacting with the secret storage backend.
#[derive(Debug)]
pub enum StorageError {
    /// A generic backend error with a human-readable message.
    Backend(String),
}

pub type StorageResult<T> = Result<T, StorageError>;

/// Abstraction over the underlying storage for secrets.
///
/// This trait is intentionally small so it can be implemented both by an
/// in-memory test double and by a Redis-backed implementation in production.
#[async_trait]
pub trait SecretStore: Send + Sync {
    /// Persist a new secret and return the full `Secret` record, including its id.
    async fn store_secret(
        &self,
        ciphertext: String,
        iv: String,
        ttl_secs: u32,
    ) -> StorageResult<Secret>;

    /// Fetch a secret by id and remove it from storage so it can only be read once.
    async fn get_and_delete_secret(&self, id: &str) -> StorageResult<Option<Secret>>;

    /// Lightweight health check for the underlying backend.
    async fn ping(&self) -> StorageResult<()>;
}

/// Simple in-memory implementation of `SecretStore` for tests and local development.
///
/// This implementation does **not** enforce TTL-based expiration; it is focused on
/// correctness of one-time read semantics and basic storage behavior for now.
#[derive(Debug, Default)]
pub struct InMemorySecretStore {
    inner: Arc<RwLock<HashMap<String, Secret>>>,
}

impl InMemorySecretStore {
    pub fn new() -> Self {
        Self {
            inner: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl SecretStore for InMemorySecretStore {
    async fn store_secret(
        &self,
        ciphertext: String,
        iv: String,
        ttl_secs: u32,
    ) -> StorageResult<Secret> {
        let secret = Secret::new(ciphertext, iv, ttl_secs);
        let id = secret.id.clone();

        let mut guard = self.inner.write().await;
        guard.insert(id, secret.clone());

        Ok(secret)
    }

    async fn get_and_delete_secret(&self, id: &str) -> StorageResult<Option<Secret>> {
        let mut guard = self.inner.write().await;
        Ok(guard.remove(id))
    }

    async fn ping(&self) -> StorageResult<()> {
        // For the in-memory implementation there is nothing to verify beyond being constructed.
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn store_and_get_and_delete_secret_round_trip() {
        let store = InMemorySecretStore::new();

        let created = store
            .store_secret("ciphertext".into(), "iv".into(), 60)
            .await
            .expect("store_secret should succeed");

        let fetched = store
            .get_and_delete_secret(&created.id)
            .await
            .expect("get_and_delete_secret should succeed")
            .expect("secret should exist");

        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.ciphertext, created.ciphertext);
        assert_eq!(fetched.iv, created.iv);
        assert_eq!(fetched.ttl_secs, created.ttl_secs);
    }

    #[tokio::test]
    async fn get_and_delete_secret_is_one_time() {
        let store = InMemorySecretStore::new();

        let created = store
            .store_secret("ciphertext".into(), "iv".into(), 10)
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
    async fn ping_succeeds_for_in_memory_store() {
        let store = InMemorySecretStore::new();
        store.ping().await.expect("ping should succeed");
    }
}


