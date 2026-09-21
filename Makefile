.DEFAULT_GOAL := help
.PHONY: help setup dev start infra-up infra-down build test e2e release clean

PLUGIN_DIR := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

setup: ## Install dev dependencies (pnpm)
	pnpm install --frozen-lockfile

# Override to use a source checkout: make dev OPENCLAW="node ../openclaw-src/openclaw.mjs"
OPENCLAW ?= openclaw
# The host's install scan walks every directory under the plugin, with no ignore list.
SCAN_MAX_DIRS := 10000

dev: ## Link the plugin into a local OpenClaw gateway and enable it
	@dirs=$$(find "$(PLUGIN_DIR)" -type d | wc -l); \
	if [ $$dirs -gt $(SCAN_MAX_DIRS) ]; then \
		echo "$(PLUGIN_DIR) has $$dirs directories; the OpenClaw install scan stops at $(SCAN_MAX_DIRS)."; \
		echo "Move large checkouts (e.g. tmp/openclaw) outside the plugin directory."; \
		exit 1; \
	fi
	$(OPENCLAW) plugins install --link "$(PLUGIN_DIR)" --force --accept-capabilities
	$(OPENCLAW) plugins enable jev-gate --accept-capabilities
	@echo "Store the TypeSafe API key (README, Setup step 2), restart the gateway, then run: $(OPENCLAW) plugins inspect jev-gate --runtime --json"

start: ## No-op: the plugin runs inside the OpenClaw gateway process
	@echo "Nothing to start. The gateway loads the plugin (see 'make dev')."

infra-up: ## No-op: no local infrastructure
	@echo "No infrastructure for this plugin."

infra-down: ## No-op: no local infrastructure
	@echo "No infrastructure for this plugin."

build: ## Type-check and emit dist/
	pnpm run typecheck
	pnpm run build

test: ## Run unit tests
	pnpm run test

e2e: ## No-op: exercise the gate against a live gateway with 'make dev'
	@echo "No automated E2E suite. Use 'make dev' and send a group message."

release: ## No-op: not published yet
	@echo "Not published. To publish: point openclaw.extensions at dist/index.js, then npm pack."

clean: ## Remove build output
	rm -rf dist
