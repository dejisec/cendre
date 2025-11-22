COMPOSE ?= docker compose
DC_FILE ?= docker-compose.yml

.PHONY: help up down logs ps redis-up redis-down backend-integration-test

help:
	@echo "Common commands:"
	@echo "  make up                        # Start redis (backend/frontend build is not wired yet)"
	@echo "  make down                      # Stop all services and remove containers"
	@echo "  make logs                      # Tail logs for all services"
	@echo "  make ps                        # Show docker-compose service status"
	@echo "  make redis-up                  # Start only the redis service"
	@echo "  make redis-down                # Stop only the redis service"
	@echo "  make backend-integration-test  # Run backend Redis integration tests against docker-compose redis"

up: redis-up

down:
	$(COMPOSE) -f $(DC_FILE) down

logs:
	$(COMPOSE) -f $(DC_FILE) logs -f

ps:
	$(COMPOSE) -f $(DC_FILE) ps

redis-up:
	$(COMPOSE) -f $(DC_FILE) up -d redis

redis-down:
	$(COMPOSE) -f $(DC_FILE) stop redis

# Run the backend Redis integration tests against the redis instance from docker-compose.
# This uses the same REDIS_URL as the backend service in docker-compose.yml.
backend-integration-test: redis-up
	cd backend && REDIS_URL=redis://localhost:6379 cargo test --test redis_integration


