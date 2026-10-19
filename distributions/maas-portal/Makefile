SHELL := /bin/bash
.DEFAULT_GOAL := help

export GATEWAY_DOMAIN ?=
export MAAS_API_URL ?= $(if $(GATEWAY_DOMAIN),https://$(GATEWAY_DOMAIN)/maas-api)
export LLAMA_STACK_URL ?= http://localhost:8321
export MLFLOW_URL ?= http://localhost:5001
export CGO_ENABLED ?= 0
export GOTMPDIR ?= /tmp/go-tmp
export SHELL_PORT ?= 4020
export FOLLOW_LOGS ?= 1
export RELATED_IMAGE_ODH_OGX_CORE_IMAGE ?= dev-placeholder-ogx
export RELATED_IMAGE_POSTGRESQL_16_IMAGE ?= dev-placeholder-postgres

.PHONY: help grid-start-federated grid-start-mock grid-stop grid-logs

help:
	@echo 'make grid-start-federated - Start with AUTH_TOKEN and GATEWAY_DOMAIN'
	@echo 'make grid-start-mock      - Start with mock data'
	@echo 'make grid-stop            - Stop services'
	@echo 'make grid-logs            - Follow logs'

# Bash job control gives each service its own process group, including go run children.
# nohup supports background mode; attached mode cleans up its groups on exit.
grid-start-federated grid-start-mock:
	@set -eum; \
	if [[ '$@' == grid-start-mock ]]; then \
		export AUTH_TOKEN=mock-token MOCK_USER=user@example.com; \
		maas_target=dev-bff-federated-mock; \
		genai_args=(-C ../../packages/gen-ai/bff run PORT=8080 AUTH_METHOD=user_token MOCK_K8S_CLIENT=true MOCK_LS_CLIENT=true MOCK_MCP_CLIENT=true MOCK_MLFLOW_CLIENT=true MOCK_BFF_CLIENTS=true MOCK_NEMO_CLIENT=true LLAMA_STACK_URL= MLFLOW_URL=); \
	else \
		for name in AUTH_TOKEN GATEWAY_DOMAIN MAAS_API_URL LLAMA_STACK_URL MLFLOW_URL; do \
			if [[ -z "$${!name:-}" ]]; then echo "$$name is required; export it before make $@." >&2; exit 1; fi; \
		done; \
		unset MOCK_USER; \
		if [[ "$$AUTH_TOKEN" =~ ^[Bb]earer[[:space:]]+(.+)$$ ]]; then export AUTH_TOKEN="$${BASH_REMATCH[1]}"; fi; \
		maas_target=dev-bff-federated; \
		genai_args=(-C ../../packages/gen-ai dev-bff-maas); \
	fi; \
	for command in go pnpm lsof; do command -v "$$command" >/dev/null || { echo "$$command is required." >&2; exit 1; }; done; \
	for port in 8081 8080 "$$SHELL_PORT"; do \
		if lsof -nP -iTCP:"$$port" -sTCP:LISTEN >/dev/null 2>&1; then \
			echo "Port $$port is already in use. Stop its service first." >&2; exit 1; \
		fi; \
	done; \
	umask 077; mkdir -p .local-bffs; \
	mkdir .local-bffs/pids 2>/dev/null || { echo 'Already started; run make grid-stop first.' >&2; exit 1; }; \
	trap '$(MAKE) --no-print-directory grid-stop' ERR; \
	trap '$(MAKE) --no-print-directory grid-stop; exit 1' INT TERM; \
	if [[ -n "$$GOTMPDIR" ]]; then mkdir -p "$$GOTMPDIR"; fi; \
	unset EXT_CLUSTER OC_PROJECT; \
	export MAAS_BFF_TARGET=http://localhost:8081 GENAI_BFF_TARGET=http://localhost:8080; \
	nohup $(MAKE) -C ../../packages/maas "$$maas_target" </dev/null >.local-bffs/maas.log 2>&1 & echo $$! >.local-bffs/pids/maas.pid; \
	nohup $(MAKE) "$${genai_args[@]}" </dev/null >.local-bffs/genai.log 2>&1 & echo $$! >.local-bffs/pids/genai.pid; \
	nohup pnpm run dev </dev/null >.local-bffs/portal.log 2>&1 & echo $$! >.local-bffs/pids/portal.pid; \
	sleep 1; \
	for file in .local-bffs/pids/*.pid; do \
		if ! kill -0 "$$(cat "$$file")" 2>/dev/null; then \
			echo "Startup failed for $${file##*/}; check .local-bffs/*.log." >&2; \
			$(MAKE) --no-print-directory grid-stop; exit 1; \
		fi; \
	done; \
	echo "Portal: http://localhost:$$SHELL_PORT/maas-portal/"; \
	if [[ "$$FOLLOW_LOGS" != 0 ]]; then \
		trap - ERR; \
		trap '$(MAKE) --no-print-directory grid-stop' EXIT; \
		trap 'exit 130' INT; \
		trap 'exit 143' TERM HUP; \
		$(MAKE) --no-print-directory grid-logs; \
	fi

grid-logs:
	@test -f .local-bffs/portal.log || { echo 'No logs yet. Start a grid setup first.' >&2; exit 1; }
	@tail -n +1 -F .local-bffs/maas.log .local-bffs/genai.log .local-bffs/portal.log

# Signal whole groups: stopping just make/pnpm can leave the Go/Node servers alive.
grid-stop:
	@set -eu; \
	for file in .local-bffs/pids/*.pid; do \
		[[ -f "$$file" ]] || continue; \
		pid=$$(cat "$$file"); \
		[[ "$$pid" =~ ^[0-9]+$$ && "$$pid" -gt 1 ]] || { echo "Invalid PID in $$file" >&2; exit 1; }; \
		kill -TERM -- "-$$pid" 2>/dev/null || true; \
	done; \
	for attempt in {1..20}; do \
		running=0; \
		for file in .local-bffs/pids/*.pid; do \
			[[ -f "$$file" ]] || continue; \
			kill -0 -- "-$$(cat "$$file")" 2>/dev/null && running=1; \
		done; \
		[[ $$running == 1 ]] || break; sleep 0.1; \
	done; \
	for file in .local-bffs/pids/*.pid; do \
		[[ -f "$$file" ]] || continue; \
		kill -KILL -- "-$$(cat "$$file")" 2>/dev/null || true; \
		rm "$$file"; \
	done; \
	if [[ -d .local-bffs/pids ]]; then rmdir .local-bffs/pids; fi; \
	echo 'Services stopped. Logs kept in .local-bffs/.'
