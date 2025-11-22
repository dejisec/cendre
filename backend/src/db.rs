use std::collections::HashMap;
use std::sync::Arc;

use async_trait::async_trait;
use redis::AsyncCommands;
use redis::aio::ConnectionManager;
use tokio::sync::{Mutex, RwLock};

use crate::models::Secret;

/// Errors that can occur when interacting with the secret storage backend.
#[derive(Debug)]
pub enum StorageError {
    /// A generic backend error with a human-readable message.
    Backend(String),
}

pub type StorageResult<T> = Result<T, StorageError>;

impl From<redis::RedisError> for StorageError {
    fn from(err: redis::RedisError) -> Self {
        StorageError::Backend(err.to_string())
    }
}

impl From<serde_json::Error> for StorageError {
    fn from(err: serde_json::Error) -> Self {
        StorageError::Backend(err.to_string())
    }
}

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

/// Redis-backed implementation of `SecretStore`.
///
/// Secrets are stored as JSON-serialized `Secret` values under keys with a fixed
/// prefix and a TTL enforced by Redis. One-time read semantics are implemented
/// by deleting the key after a successful read.
pub struct RedisSecretStore {
    connection: Arc<Mutex<ConnectionManager>>,
    key_prefix: String,
}

impl RedisSecretStore {
    /// Construct a new `RedisSecretStore` from the given Redis URL.
    pub async fn new(redis_url: &str) -> StorageResult<Self> {
        Self::with_prefix(redis_url, "secret:").await
    }

    /// Construct a new `RedisSecretStore` with an explicit key prefix.
    ///
    /// This is primarily useful for tests to isolate keys.
    pub async fn with_prefix(redis_url: &str, key_prefix: &str) -> StorageResult<Self> {
        let client =
            redis::Client::open(redis_url).map_err(|e| StorageError::Backend(e.to_string()))?;

        let manager = client
            .get_connection_manager()
            .await
            .map_err(|e| StorageError::Backend(e.to_string()))?;

        Ok(Self {
            connection: Arc::new(Mutex::new(manager)),
            key_prefix: key_prefix.to_string(),
        })
    }

    fn make_key(&self, id: &str) -> String {
        format!("{}{}", self.key_prefix, id)
    }
}

#[async_trait]
impl SecretStore for RedisSecretStore {
    async fn store_secret(
        &self,
        ciphertext: String,
        iv: String,
        ttl_secs: u32,
    ) -> StorageResult<Secret> {
        let secret = Secret::new(ciphertext, iv, ttl_secs);
        let key = self.make_key(&secret.id);

        let json = serde_json::to_string(&secret)?;

        let mut conn = self.connection.lock().await;
        let _: () = conn.set_ex(key, json, ttl_secs as u64).await?;

        Ok(secret)
    }

    async fn get_and_delete_secret(&self, id: &str) -> StorageResult<Option<Secret>> {
        let key = self.make_key(id);

        let mut conn = self.connection.lock().await;

        let json: Option<String> = conn.get(&key).await?;

        if let Some(json) = json {
            let secret: Secret = serde_json::from_str(&json)?;

            let _: usize = conn.del(&key).await?;

            Ok(Some(secret))
        } else {
            Ok(None)
        }
    }

    async fn ping(&self) -> StorageResult<()> {
        let mut conn = self.connection.lock().await;

        let _: String = redis::cmd("PING").query_async(&mut *conn).await?;

        Ok(())
    }
}
