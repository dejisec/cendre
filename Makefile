SHELL := /bin/bash

DOCKER_COMPOSE ?= docker compose
DC_FILE        := -f docker-compose.yml

BACKEND_DIR    := backend
FRONTEND_DIR   := frontend

.PHONY: help run run_detached down logs build \
	test_backend test_frontend test_e2e test_all \
	format backend_fmt frontend_lint \
	_stack_up _stack_up_detached _stack_down

help:
	@echo "Cendre – common workflows"
	@echo
	@echo "Dev stack:"
	@echo "  make run           # start full stack with docker-compose (foreground)"
	@echo "  make run_detached  # start full stack in background (-d)"
	@echo "  make down              # stop stack and remove containers"
	@echo "  make logs              # follow logs for all services"
	@echo "  make build             # build all docker images"
	@echo
	@echo "Tests:"
	@echo "  make test_backend      # cargo test in backend/"
	@echo "  make test_frontend     # npm test in frontend/ (unit/component)"
	@echo "  make test_e2e          # Playwright e2e tests against docker-compose stack"
	@echo "  make test_all          # backend + frontend + e2e"
	@echo
	@echo "Code quality:"
	@echo "  make format            # cargo fmt + frontend lint"

_stack_up:
	$(DOCKER_COMPOSE) $(DC_FILE) up

_stack_up_detached:
	$(DOCKER_COMPOSE) $(DC_FILE) up -d

_stack_down:
	$(DOCKER_COMPOSE) $(DC_FILE) down

run: _stack_up

run_detached: _stack_up_detached

down: _stack_down

logs:
	$(DOCKER_COMPOSE) $(DC_FILE) logs -f

build:
	$(DOCKER_COMPOSE) $(DC_FILE) build

test_backend:
	cd $(BACKEND_DIR) && cargo test

test_frontend:
	cd $(FRONTEND_DIR) && npm test

test_e2e: _stack_up_detached
	cd $(FRONTEND_DIR) && npm run e2e
	$(MAKE) _stack_down

test_all: test_backend test_frontend test_e2e

backend_fmt:
	cd $(BACKEND_DIR) && cargo fmt

frontend_lint:
	cd $(FRONTEND_DIR) && npm run lint

format: backend_fmt frontend_lint

