FROM rust:1.85-slim AS builder

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src

RUN cargo build --release

FROM debian:bookworm-slim

RUN useradd -m cendre

WORKDIR /app

COPY --from=builder /app/target/release/cendre-backend /usr/local/bin/cendre-backend

ENV RUST_LOG=cendre_backend=info,tower_http=info

EXPOSE 8080

USER cendre

CMD ["cendre-backend"]


