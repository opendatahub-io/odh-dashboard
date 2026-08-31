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
	helper "github.com/opendatahub-io/maas-library/bff/internal/helpers"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/maas-library/bff/internal/integrations/maas"
	"github.com/opendatahub-io/maas-library/bff/internal/repositories"
)

// setupApiTest exercises handlers against envtest-backed Kubernetes repositories.
func setupApiTest[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity) (T, *http.Response, error) {
	return doApiTest[T](method, url, body, k8Factory, identity, false)
}

// setupMockApiTest exercises handlers against in-memory mock repositories (dev BFF path).
func setupMockApiTest[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity) (T, *http.Response, error) {
	return doApiTest[T](method, url, body, k8Factory, identity, true)
}

func doApiTest[T any](method, url string, body interface{}, k8Factory kubernetes.KubernetesClientFactory, identity *kubernetes.RequestIdentity, useMocks bool) (T, *http.Response, error) {
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
		AllowedOrigins:            []string{"*"},
		AuthMethod:                config.AuthMethodInternal,
		GatewayNamespace:          "openshift-ingress",
		GatewayName:               "maas-default-gateway",
		MockHTTPClient:            true,
		MaasApiUrl:                maasFakeServer.URL,
		MaaSSubscriptionNamespace: "maas-system",
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))

	repos, err := newTestRepositories(logger, k8Factory, envConfig, useMocks)
	if err != nil {
		return empty, nil, err
	}
	app := &App{
		config:                  envConfig,
		kubernetesClientFactory: k8Factory,
		repositories:            repos,
		logger:                  logger,
		maasApiURL:              helper.NewMaasApiURLHolder(envConfig.MaasApiUrl),
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

func newTestRepositories(
	logger *slog.Logger,
	k8Factory kubernetes.KubernetesClientFactory,
	envConfig config.EnvConfig,
	useMocks bool,
) (*repositories.Repositories, error) {
	if useMocks {
		modelRefsRepo := repositories.NewMockMaaSModelRefsRepository(logger)
		return repositories.NewRepositories(
			logger,
			k8Factory,
			envConfig,
			repositories.NewMockSubscriptionsRepository(logger),
			repositories.NewMockPoliciesRepository(logger),
			modelRefsRepo,
			repositories.NewMockExternalModelsRepository(logger, modelRefsRepo),
			repositories.NewMockExternalProvidersRepository(logger),
			repositories.NewMockSecretsRepository(logger),
			repositories.NewMockYamlRepository(logger),
		)
	}

	modelRefsRepo := repositories.NewMaaSModelRefsRepository(logger, k8Factory)
	return repositories.NewRepositories(
		logger,
		k8Factory,
		envConfig,
		repositories.NewSubscriptionsRepository(logger, k8Factory, envConfig.MaaSSubscriptionNamespace),
		repositories.NewPoliciesRepository(logger, k8Factory, envConfig.MaaSSubscriptionNamespace),
		modelRefsRepo,
		repositories.NewExternalModelsRepository(logger, k8Factory, modelRefsRepo),
		repositories.NewExternalProvidersRepository(logger, k8Factory),
		repositories.NewSecretsRepository(logger, k8Factory),
		repositories.NewYamlRepository(logger, k8Factory, envConfig.MaaSSubscriptionNamespace),
	)
}
