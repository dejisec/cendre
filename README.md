# Cendre – Burn After Reading

Cendre is a zero‑knowledge, burn‑after‑reading secret sharing service.

You paste a secret into the UI, Cendre encrypts it **in your browser** using AES‑GCM, ships only ciphertext + IV to the backend, stores it **ephemerally** in Redis, and gives you a one‑time URL. The first person to open that URL (with the `#key` fragment intact) can decrypt the secret exactly once; after that, the secret is gone or expires when its TTL elapses.

- **Client‑side encryption**: Secrets are encrypted via WebCrypto (AES‑GCM 256) in the browser; the backend never sees plaintext or keys.
- **Ephemeral storage**: Only ciphertext, IV, TTL and timestamps are stored in Redis with a key‑level TTL.
- **One‑time read**: Secrets are deleted on first successful retrieval; a second read returns `404`.
- **Zero‑knowledge URLs**: The decryption key lives only in the URL fragment (`#key`), which is never sent over HTTP and is not logged.

## Usage

- **Start the stack (foreground)**:
  - `make run`
- **Follow logs**:
  - `make logs`
- **Stop everything**:
  - `make down`

Once running:

- Frontend: `http://127.0.0.1:5173`
- Backend API: `http://127.0.0.1:8080`
- Redis: `redis://127.0.0.1:6379`

Configuration defaults are in `env.example` (you can copy to `.env` in your environment/orchestrator as needed).

## High‑Level Architecture

- **Frontend (`frontend/`)**
  - React + Vite SPA, styled with Tailwind.
  - Uses React Router for two main routes:
    - `/` → `CreateForm` (encrypt + create one‑time URL).
    - `/s/:id` → `ReadView` (fetch + decrypt once).
  - Handles key generation, AES‑GCM encryption/decryption, base64‑URL safe encoding, and link construction.
- **Backend (`backend/`)**
  - Rust 1.85, Axum 0.7.
  - Exposes a small JSON API for storing and retrieving encrypted secrets.
  - Uses a `SecretStore` abstraction with an in‑memory implementation for tests/dev and a Redis‑backed implementation for production.
  - Enforces **one‑time read** semantics and validates TTL bounds.
- **Storage (Redis)**
  - Every secret is stored as a JSON blob under a `secret:{uuid}` key with a Redis TTL.
  - Redis key expiry enforces time‑based deletion; explicit deletion enforces the one‑time read rule.
- **Infra**
  - `docker-compose.yml` orchestrates Redis, backend, and frontend.
  - Separate Dockerfiles for backend (`cendre-backend` binary) and frontend (nginx‑served static build that proxies `/api` to backend).
