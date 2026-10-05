# E2E Backend (BFF) — see docs/bff-e2e-testing.md
#
# The notebooks package doesn't have its own bff/ directory; the upstream Kubeflow
# workspaces/backend Go server fills that role (see README.md "BFF source code").
# This Makefile lives outside upstream/ so it survives subtree syncs.
E2E_BFF_PORT ?= 9105
ENVTEST_K8S_VERSION ?= 1.31.0

# module-federation.tls is true for this package (required for the real, standalone
# deployment — see manifests/modules/notebooks/{deployment,service}.yaml, which terminate
# HTTPS via an OpenShift serving-cert). The dashboard backend's module-federation proxy
# therefore always calls this BFF over https, including locally/in e2e, so the e2e BFF
# needs a cert too. We generate a throwaway self-signed one here rather than flipping
# tls to false, which would break the real deployment. The e2e dashboard backend sets
# NODE_TLS_REJECT_UNAUTHORIZED=0 (backend/package.json's cypress:server:e2e script), so
# the self-signed cert is accepted without needing a trusted CA.
E2E_TLS_DIR := $(CURDIR)/.e2e-tls
E2E_TLS_CERT := $(E2E_TLS_DIR)/tls.crt
E2E_TLS_KEY := $(E2E_TLS_DIR)/tls.key

.PHONY: e2e-tls-cert
e2e-tls-cert: ## Generate a throwaway self-signed TLS cert for the local e2e BFF (not used in production)
	@mkdir -p $(E2E_TLS_DIR)
	@if [ ! -f $(E2E_TLS_CERT) ] || [ ! -f $(E2E_TLS_KEY) ]; then \
		echo "Generating self-signed TLS cert for e2e BFF at $(E2E_TLS_DIR)..."; \
		openssl req -x509 -newkey rsa:2048 -nodes -days 1 \
			-keyout $(E2E_TLS_KEY) -out $(E2E_TLS_CERT) \
			-subj "/CN=localhost" -addext "subjectAltName=DNS:localhost"; \
	fi

.PHONY: dev-bff-e2e-mock
dev-bff-e2e-mock: e2e-tls-cert ## Run the notebooks backend for e2e tests using an envtest-backed fake control plane (no real cluster required)
	cd upstream/workspaces/backend && \
	$(MAKE) envtest && \
	KUBEBUILDER_ASSETS=$$(./bin/setup-envtest use $(ENVTEST_K8S_VERSION) --bin-dir ./bin -p path) \
	go run -tags mockk8s ./cmd --port=$(E2E_BFF_PORT) --mock-k8s-client --disable-auth=true \
		--cert-file=$(E2E_TLS_CERT) --key-file=$(E2E_TLS_KEY)

.PHONY: dev-bff-e2e-cluster
dev-bff-e2e-cluster: e2e-tls-cert ## Run the notebooks backend for e2e tests against a real cluster
	cd upstream/workspaces/backend && \
	go run ./cmd --port=$(E2E_BFF_PORT) --auth-method=user_token --auth-token-header=Authorization --auth-token-prefix="Bearer " --disable-auth=false \
		--cert-file=$(E2E_TLS_CERT) --key-file=$(E2E_TLS_KEY)
