use base64::Engine;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use serde::{Deserialize, Serialize};
use time::{Duration, OffsetDateTime};
use uuid::Uuid;

/// Domain model representing an encrypted secret stored by the service.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
pub struct Secret {
    pub id: String,
    pub ciphertext: String,
    pub iv: String,
    pub created_at: OffsetDateTime,
    pub ttl_secs: u32,
    pub read_at: Option<OffsetDateTime>,
}

impl Secret {
    /// Create a new `Secret` with a freshly generated id and current timestamp.
    pub fn new(ciphertext: String, iv: String, ttl_secs: u32) -> Self {
        let created_at = OffsetDateTime::now_utc();
        let uuid = Uuid::new_v4();
        let id = URL_SAFE_NO_PAD.encode(uuid.as_bytes());

        Secret {
            id,
            ciphertext,
            iv,
            created_at,
            ttl_secs,
            read_at: None,
        }
    }

    /// Returns the instant at which this secret should expire.
    pub fn expires_at(&self) -> OffsetDateTime {
        self.created_at + Duration::seconds(self.ttl_secs as i64)
    }

    /// Returns true if the secret should be considered expired at the given time.
    pub fn is_expired_at(&self, now: OffsetDateTime) -> bool {
        now >= self.expires_at()
    }

    /// Mark the secret as having been read at the provided instant.
    pub fn mark_read(&mut self, when: OffsetDateTime) {
        self.read_at = Some(when);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_secret_sets_expected_fields() {
        let ciphertext = "ciphertext".to_string();
        let iv = "iv".to_string();
        let ttl_secs = 120;

        let secret = Secret::new(ciphertext.clone(), iv.clone(), ttl_secs);

        assert!(!secret.id.is_empty(), "id should be non-empty");
        assert!(
            secret.id.len() <= 24,
            "short ids should be base64url encoded (<=24 chars)"
        );
        assert!(
            secret
                .id
                .chars()
                .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_'),
            "id must be URL-safe base64 characters"
        );
        assert_eq!(secret.ciphertext, ciphertext);
        assert_eq!(secret.iv, iv);
        assert_eq!(secret.ttl_secs, ttl_secs);
        assert!(
            secret.read_at.is_none(),
            "new secrets should not be marked as read"
        );
    }

    #[test]
    fn expires_at_is_created_at_plus_ttl() {
        let ttl_secs = 60;
        let secret = Secret::new("c".into(), "i".into(), ttl_secs);

        let delta = secret.expires_at() - secret.created_at;
        assert_eq!(delta, Duration::seconds(ttl_secs as i64));
    }

    #[test]
    fn is_expired_at_respects_expires_at_boundary() {
        let ttl_secs = 30;
        let mut secret = Secret::new("c".into(), "i".into(), ttl_secs);

        // Stabilize created_at to a known value to make this test fully deterministic.
        let fixed_now = OffsetDateTime::UNIX_EPOCH;
        secret.created_at = fixed_now;

        let before_expiry = fixed_now + Duration::seconds(ttl_secs as i64 - 1);
        let at_expiry = fixed_now + Duration::seconds(ttl_secs as i64);
        let after_expiry = fixed_now + Duration::seconds(ttl_secs as i64 + 1);

        assert!(!secret.is_expired_at(before_expiry));
        assert!(secret.is_expired_at(at_expiry));
        assert!(secret.is_expired_at(after_expiry));
    }

    #[test]
    fn mark_read_sets_read_at_timestamp() {
        let mut secret = Secret::new("c".into(), "i".into(), 10);
        let when = OffsetDateTime::UNIX_EPOCH + Duration::seconds(42);

        assert!(secret.read_at.is_none());
        secret.mark_read(when);
        assert_eq!(secret.read_at, Some(when));
    }
}
