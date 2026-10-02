# E2E Backend (BFF) — see docs/bff-e2e-testing.md
#
# The notebooks package doesn't have its own bff/ directory; the upstream Kubeflow
# workspaces/backend Go server fills that role (see README.md "BFF source code").
# This Makefile lives outside upstream/ so it survives subtree syncs.
E2E_BFF_PORT ?= 9105
ENVTEST_K8S_VERSION ?= 1.31.0

.PHONY: dev-bff-e2e-mock
dev-bff-e2e-mock: ## Run the notebooks backend for e2e tests using an envtest-backed fake control plane (no real cluster required)
	cd upstream/workspaces/backend && \
	$(MAKE) envtest && \
	KUBEBUILDER_ASSETS=$$(./bin/setup-envtest use $(ENVTEST_K8S_VERSION) --bin-dir ./bin -p path) \
	go run -tags mockk8s ./cmd --port=$(E2E_BFF_PORT) --mock-k8s-client --disable-auth=true

.PHONY: dev-bff-e2e-cluster
dev-bff-e2e-cluster: ## Run the notebooks backend for e2e tests against a real cluster
	cd upstream/workspaces/backend && \
	go run ./cmd --port=$(E2E_BFF_PORT) --auth-method=user_token --auth-token-header=Authorization --auth-token-prefix="Bearer " --disable-auth=false
