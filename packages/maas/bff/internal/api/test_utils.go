package api

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"

	"github.com/opendatahub-io/maas-library/bff/internal/config"
	"github.com/opendatahub-io/maas-library/bff/internal/constants"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

// setupApiTest is a minimal helper to exercise remaining handlers (user, namespaces, healthcheck)
func setupApiTest[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity) (T, *http.Response, error) {
	var empty T
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return empty, nil, err
		}
		reqBody = bytes.NewReader(b)
	}
	if reqBody == nil {
		reqBody = http.NoBody
	}
	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return empty, nil, err
	}

	// Inject headers expected by middleware for internal auth
	if identity != nil && identity.UserID != "" {
		req.Header.Set(constants.KubeflowUserIDHeader, identity.UserID)
	}

	maasFakeServer := maas.CreateMaasFakeServer()
	defer maasFakeServer.Close()

	envConfig := config.EnvConfig{
		AllowedOrigins:          []string{"*"},
		AuthMethod:              config.AuthMethodInternal,
		TiersConfigMapNamespace: "maas-api",
		TiersConfigMapName:      "tier-to-group-mapping",
		GatewayNamespace:        "openshift-ingress",
		GatewayName:             "maas-default-gateway",
		MockHTTPClient:          true,
		MaasApiUrl:              maasFakeServer.URL,
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	repos, err := repositories.NewRepositories(logger, k8Factory, envConfig)
	if err != nil {
		return empty, nil, err
	}
	app := &App{
		config:                  envConfig,
		kubernetesClientFactory: k8Factory,
		repositories:            repos,
		logger:                  logger,
	}

	ctx := context.WithValue(req.Context(), constants.RequestIdentityKey, identity)
	req = req.WithContext(ctx)

	rr := httptest.NewRecorder()
	app.Routes().ServeHTTP(rr, req)
	res := rr.Result()
	defer res.Body.Close()
	data, err := io.ReadAll(res.Body)
	if err != nil {
		return empty, nil, err
	}
	if len(data) == 0 {
		return empty, res, nil
	}
	var out T
	if err := json.Unmarshal(data, &out); err != nil && err != io.EOF {
		return empty, res, err
	}
	return out, res, nil
}
