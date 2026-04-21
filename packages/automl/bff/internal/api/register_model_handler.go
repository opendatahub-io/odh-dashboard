package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	k8s "github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/modelregistry"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
)

// maxRequestBodyBytes caps the request body size to 1 MiB for register model requests.
const maxRegisterModelRequestBodyBytes = 1 << 20

// RegisterModelResponseData is the payload returned to the frontend after a
// successful model registration. It includes the registered model ID so the
// frontend can construct a direct link to the model details page.
type RegisterModelResponseData struct {
	RegisteredModelID string                 `json:"registered_model_id"`
	ModelArtifact     *openapi.ModelArtifact `json:"model_artifact"`
}

type RegisterModelEnvelope Envelope[*RegisterModelResponseData, None]

// RegisterModelHandler handles POST /api/v1/model-registries/:registryId/models
//
// Registers a model binary in the Model Registry by creating a RegisteredModel,
// ModelVersion, and ModelArtifact in sequence. The ModelArtifact points to the
// provided S3 URI.
//
// The handler resolves the target registry from the :registryId path parameter
// (Kubernetes UID of the ModelRegistry CR) using the same discovery path as
// GET /model-registries, then POSTs to that instance's ServerURL.
//
// Error Responses:
//   - 400: Invalid request body, missing required fields, invalid S3 path, or invalid registry URL
//   - 403: Caller cannot list ModelRegistries (RBAC)
//   - 404: No ModelRegistry matches registryId
//   - 503: Registry exists but is not ready
//   - 500: Model Registry API error or internal server error
func (app *App) RegisterModelHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	ctx := r.Context()
	logger := helper.GetContextLoggerFromReq(r)

	registryId := strings.TrimSpace(ps.ByName("registryId"))
	if registryId == "" {
		app.badRequestResponse(w, r, fmt.Errorf("registryId path parameter is required"))
		return
	}

	var req models.RegisterModelRequest
	decoder := json.NewDecoder(io.LimitReader(r.Body, maxRegisterModelRequestBodyBytes))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid request body: %w", err))
		return
	}
	var extra interface{}
	if err := decoder.Decode(&extra); err != io.EOF {
		app.badRequestResponse(w, r, fmt.Errorf("request body must contain only a single JSON object"))
		return
	}

	if err := repositories.ValidateRegisterModelRequest(req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	var k8sClient k8s.KubernetesClientInterface
	if !app.config.MockK8Client {
		var err error
		k8sClient, err = app.kubernetesClientFactory.GetClient(ctx)
		if err != nil {
			app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
			return
		}
	}

	reg, err := app.repositories.ModelRegistry.ResolveModelRegistryByUID(
		ctx, k8sClient, identity, app.config.MockK8Client, registryId, logger)
	if err != nil {
		if errors.Is(err, repositories.ErrModelRegistryForbidden) {
			app.forbiddenResponse(w, r, "insufficient permissions to list model registries")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotFound) {
			app.notFoundResponseWithMessage(w, r, "no model registry found for the given registryId")
			return
		}
		if errors.Is(err, repositories.ErrModelRegistryNotReady) {
			app.serviceUnavailableResponseWithMessage(w, r, err, "model registry is not ready")
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Always prefer ExternalURL when available to avoid NetworkPolicy restrictions.
	// The model-registry-operator creates a NetworkPolicy that blocks in-cluster traffic
	// to the kube-rbac-proxy on port 8443, only allowing external Route access.
	// Fall back to ServerURL only if ExternalURL is not available.
	baseURL := ""
	if strings.TrimSpace(reg.ExternalURL) != "" {
		baseURL = strings.TrimSuffix(strings.TrimSpace(reg.ExternalURL), "/")
		logger.Debug("Using external URL for model registry", "url", baseURL)
	} else {
		baseURL = strings.TrimSuffix(strings.TrimSpace(reg.ServerURL), "/")
		logger.Warn("Using internal URL for model registry; may fail due to NetworkPolicy restrictions", "url", baseURL)
	}
	if baseURL == "" {
		app.serviceUnavailableResponse(w, r, fmt.Errorf("model registry has no usable URL (external_url/server_url are empty)"))
		return
	}

	if err := validateResolvedModelRegistryURL(baseURL, app.config.AuthMethod); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	client, err := app.newModelRegistryHTTPClient(logger, baseURL, r)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create Model Registry HTTP client: %w", err))
		return
	}

	// Best-effort DSPA discovery: pull object storage config from the DSPA spec (bucket,
	// endpoint, region) without requiring a ready pipeline server. This is needed to
	// construct the full S3 URI for the model artifact.
	// Check context first (may already be set by upstream middleware or tests).
	dspaStorage, _ := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
	if dspaStorage == nil && app.kubernetesClientFactory != nil {
		namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		ctx = app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)
		r = r.WithContext(ctx)
		dspaStorage, _ = ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
	}
	if dspaStorage == nil {
		app.serviceUnavailableResponseWithMessage(w, r,
			fmt.Errorf("DSPA object storage config not available"),
			"DSPA object storage discovery unavailable; cannot construct artifact URI — ensure a DSPipelineApplication with external storage is configured in this namespace")
		return
	}

	registeredModelID, modelArtifact, err := app.repositories.ModelRegistry.RegisterModel(ctx, client, req, dspaStorage)
	if err != nil {
		var httpErr *modelregistry.HTTPError
		if errors.As(err, &httpErr) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode:    httpErr.StatusCode,
				ErrorResponse: integrations.ErrorResponse{Code: httpErr.Code, Message: httpErr.Message},
			})
		} else {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if modelArtifact == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("model artifact created but response is nil"))
		return
	}

	response := RegisterModelEnvelope{
		Data: &RegisterModelResponseData{
			RegisteredModelID: registeredModelID,
			ModelArtifact:     modelArtifact,
		},
	}

	if err := app.WriteJSON(w, http.StatusCreated, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func validateResolvedModelRegistryURL(serverURL, authMethod string) error {
	u, err := url.Parse(serverURL)
	if err != nil || u.Scheme == "" || u.Host == "" {
		return fmt.Errorf("invalid model registry URL")
	}
	if authMethod == config.AuthMethodUser &&
		u.Scheme != "https" &&
		u.Hostname() != "localhost" &&
		u.Hostname() != "127.0.0.1" {
		return fmt.Errorf("model registry URL must use https when using user token auth (except for localhost)")
	}
	if !strings.Contains(u.Path, "/api/model_registry/") {
		return fmt.Errorf("model registry URL path must contain /api/model_registry/")
	}
	return nil
}

// modelRegistryRequestHeaders builds outbound headers for Model Registry API calls (Bearer forwarding).
func (app *App) modelRegistryRequestHeaders(r *http.Request) http.Header {
	headers := http.Header{}
	if app.config.AuthMethod != config.AuthMethodUser {
		return headers
	}

	logger := helper.GetContextLoggerFromReq(r)
	identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity)
	tokenToForward := ""
	if ok && identity != nil && identity.Token != "" {
		tokenToForward = identity.Token
	}
	if len(tokenToForward) < 20 {
		if authHeaderValue := r.Header.Get("Authorization"); authHeaderValue != "" {
			fallbackToken := strings.TrimSpace(authHeaderValue)
			if strings.HasPrefix(fallbackToken, "Bearer ") {
				fallbackToken = strings.TrimSpace(strings.TrimPrefix(fallbackToken, "Bearer "))
			}
			if len(fallbackToken) > len(tokenToForward) {
				tokenToForward = fallbackToken
			}
		}
	}
	if tokenToForward != "" {
		headers.Set("Authorization", "Bearer "+tokenToForward)
	} else {
		logger.Warn("Model Registry: no token to forward - identity missing or empty",
			"auth_method", app.config.AuthMethod,
			"has_identity", ok && identity != nil,
			"has_token", ok && identity != nil && identity.Token != "")
	}
	return headers
}

func (app *App) newModelRegistryHTTPClient(logger *slog.Logger, baseURL string, r *http.Request) (modelregistry.HTTPClientInterface, error) {
	headers := app.modelRegistryRequestHeaders(r)
	if app.modelRegistryHTTPClientFactory != nil {
		return app.modelRegistryHTTPClientFactory(logger, baseURL, headers, app.config.InsecureSkipVerify, app.rootCAs)
	}
	return modelregistry.NewHTTPClient(logger, baseURL, headers, app.config.InsecureSkipVerify, app.rootCAs)
}
