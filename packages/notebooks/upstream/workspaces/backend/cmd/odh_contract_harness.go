/*
Copyright 2024.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

package main

// This file isolates everything the ODH Dashboard contract-test harness
// (github.com/opendatahub-io/odh-dashboard, packages/contract-tests) needs
// from this BFF, so that main.go — which is kept in sync with upstream
// kubeflow/notebooks — stays as close to upstream as possible.
//
// JIRA: RHOAIENG-58841
//
// Consumers:
//   - odh-ct-bff-consumer starts this backend with `--mock-k8s-client` (and
//     the compatibility-only flags below) after building it with
//     `BFF_GO_BUILD_TAGS=mockk8s` (see
//     opendatahub-io/odh-dashboard packages/contract-tests/scripts/run-go-bff-consumer.sh
//     and packages/notebooks/package.json's `test:contract` script).
//   - `make build-mock` / `make run` locally build/run with the same
//     `mock-k8s-client` flag for manual smoke testing without a live cluster.
//
// If another BFF under opendatahub-io/odh-dashboard (e.g. a new package's
// `upstream/bff`) wants the same contract-test integration, copy this file's
// pattern rather than main.go's: add an equivalent `odh_contract_harness.go`
// plus the `mockk8s`-tagged sibling files
// (cmd/mock_k8s_enabled.go, cmd/mock_k8s_disabled.go,
// internal/integrations/kubernetes/testenv), and call
// registerODHContractHarnessFlags / warn / resolveKubeconfig from that BFF's
// own main.go the same way this file's main.go does.

import (
	"flag"
	"fmt"
	"log/slog"

	"k8s.io/client-go/rest"
	ctrl "sigs.k8s.io/controller-runtime"

	"github.com/kubeflow/notebooks/workspaces/backend/internal/config"
)

// odhCompatFlags holds ODH contract-test harness flags that odh-ct-bff-consumer
// passes to every BFF for cross-BFF consistency, but that this backend does
// not (yet) act on. They are accepted so the harness can start the binary
// without flag-parsing errors.
type odhCompatFlags struct {
	allowedOrigins string
	mockMRClient   bool
}

// registerODHContractHarnessFlags wires up the flags the ODH contract-test
// harness expects this BFF to accept:
//   - --mock-k8s-client: gates an in-process envtest API server, implemented
//     in mock_k8s_enabled.go/mock_k8s_disabled.go (requires -tags mockk8s to
//     actually be usable; see resolveKubeconfig below).
//   - --allowed-origins, --mock-mr-client: accepted for cross-BFF harness
//     compatibility, currently ignored (see warn).
//
// Call once before flag.Parse().
func registerODHContractHarnessFlags(cfg *config.EnvConfig) *odhCompatFlags {
	flag.BoolVar(
		&cfg.MockK8sClient,
		"mock-k8s-client",
		false,
		"Use an in-process envtest Kubernetes API server (for contract tests and local mocks; requires -tags mockk8s build)",
	)

	compat := &odhCompatFlags{}
	flag.StringVar(
		&compat.allowedOrigins,
		"allowed-origins",
		"",
		"Ignored: compatibility flag for the ODH contract test harness",
	)
	flag.BoolVar(
		&compat.mockMRClient,
		"mock-mr-client",
		false,
		"Ignored: compatibility flag for the ODH contract test harness",
	)
	return compat
}

// warn logs a warning for every ODH compatibility flag that was set, since
// they are accepted but not enforced. Call after flag.Parse().
func (c *odhCompatFlags) warn(logger *slog.Logger) {
	if c == nil || logger == nil {
		return
	}
	if c.allowedOrigins != "" {
		logger.Warn("--allowed-origins is accepted for ODH harness compatibility but not enforced",
			"value", c.allowedOrigins)
	}
	if c.mockMRClient {
		logger.Warn("--mock-mr-client is accepted for ODH harness compatibility but has no effect")
	}
}

// resolveKubeconfig returns the Kubernetes REST config to use: an in-process
// envtest API when cfg.MockK8sClient is set (requires the mockk8s build
// tag), otherwise the ambient cluster/kubeconfig via ctrl.GetConfig(). The
// returned cleanup function is non-nil only for the mock path; callers must
// defer it when non-nil.
func resolveKubeconfig(cfg *config.EnvConfig, logger *slog.Logger) (*rest.Config, func() error, error) {
	if !cfg.MockK8sClient {
		kubeconfig, err := ctrl.GetConfig()
		if err != nil {
			return nil, nil, fmt.Errorf("failed to get Kubernetes config: %w", err)
		}
		return kubeconfig, nil, nil
	}

	kubeconfig, stop, err := startMockK8s(logger)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to start envtest Kubernetes API: %w", err)
	}
	return kubeconfig, stop, nil
}

// deferMockK8sStop stops the mock envtest API server via stop (the cleanup
// func resolveKubeconfig returned) and sets *status to 1 if that stop fails,
// so a teardown failure is reflected in the process's exit code instead of
// being silently swallowed. No-op if stop is nil (the non-mock path).
//
// Callers must invoke this with `defer` (not call it directly), passing the
// address of their function's named return status, e.g.:
//
//	defer deferMockK8sStop(stopMockK8s, &status, logger)
func deferMockK8sStop(stop func() error, status *int, logger *slog.Logger) {
	if stop == nil {
		return
	}
	if err := stop(); err != nil {
		logger.Error("failed to stop envtest Kubernetes API", "error", err)
		*status = 1
	}
}
