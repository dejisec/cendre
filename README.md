## Cendre – Burn After Reading

### Overview

Cendre is a zero-knowledge, burn-after-reading secret sharing service:

- **Client-side encryption**: Secrets are encrypted in the browser using AES-GCM; the backend never sees plaintext or keys.
- **Ephemeral storage**: Only ciphertext and IV are stored in Redis with a TTL.
- **One-time read**: Secrets are deleted on first successful retrieval or TTL expiry.
- **Zero-knowledge URLs**: The decryption key lives only in the URL fragment (`#key`), which is never sent to the server.
