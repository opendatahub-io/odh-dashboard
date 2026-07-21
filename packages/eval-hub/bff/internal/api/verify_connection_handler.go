package api

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/eval-hub/bff/internal/constants"
	helper "github.com/opendatahub-io/eval-hub/bff/internal/helpers"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/connectionprobe"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	k8sclient "k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

// sanitizeURL strips userinfo and query parameters from a URL for safe logging.
func sanitizeURL(raw string) string {
	u, err := url.Parse(raw)
	if err != nil {
		return "<invalid-url>"
	}
	u.User = nil
	u.RawQuery = ""
	u.Fragment = ""
	return u.String()
}

type VerifyConnectionEnvelope = Envelope[models.VerifyConnectionResponse, None]

// resolveSecretAPIKey looks up a Kubernetes Secret by name and returns the value of its
// "api-key" data field. Uses the caller's bearer token so RBAC is enforced.
func resolveSecretAPIKey(ctx context.Context, token, namespace, secretName string, logger *slog.Logger) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		return "", fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	cfg := rest.AnonymousClientConfig(baseConfig)
	cfg.BearerToken = token
	cfg.BearerTokenFile = ""
	cfg.Username = ""
	cfg.Password = ""
	cfg.ExecProvider = nil
	cfg.AuthProvider = nil

	clientset, err := k8sclient.NewForConfig(cfg)
	if err != nil {
		return "", fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	secret, err := clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to get secret %q in namespace %q: %w", secretName, namespace, err)
	}

	apiKey, ok := secret.Data["api-key"]
	if !ok || len(apiKey) == 0 {
		return "", fmt.Errorf("secret %q does not contain an \"api-key\" data field", secretName)
	}

	logger.Debug("resolved API key from secret", slog.String("secret", secretName), slog.String("namespace", namespace))
	return string(apiKey), nil
}

// VerifyConnectionHandler handles POST /api/v1/evaluations/verify-connection
func (app *App) VerifyConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req models.VerifyConnectionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.logger.Warn("verify-connection: malformed request body", "error", err)
		app.badRequestResponse(w, r, err)
		return
	}

	if req.BaseURL == "" {
		app.logger.Warn("verify-connection: missing base_url")
		app.badRequestResponse(w, r, fmt.Errorf("base_url is required"))
		return
	}
	if req.SourceType == "" {
		app.logger.Warn("verify-connection: missing source_type")
		app.badRequestResponse(w, r, fmt.Errorf("source_type is required"))
		return
	}

	validSourceTypes := map[string]bool{
		"model":       true,
		"agent":       true,
		"prerecorded": true,
	}
	if !validSourceTypes[req.SourceType] {
		app.logger.Warn("verify-connection: invalid source_type", slog.String("source_type", req.SourceType))
		app.badRequestResponse(w, r, fmt.Errorf("invalid source_type: %s (must be model, agent, or prerecorded)", req.SourceType))
		return
	}

	// Resolve secret_name → actual API key value from the Kubernetes Secret.
	secretValue := req.SecretValue
	if req.SecretName != "" {
		namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		identity, _ := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
		if identity == nil || identity.Token == "" {
			app.serverErrorResponse(w, r, fmt.Errorf("missing user identity for secret lookup"))
			return
		}

		resolved, err := resolveSecretAPIKey(ctx, identity.Token, namespace, req.SecretName, app.logger)
		if err != nil {
			app.logger.Warn("verify-connection: failed to resolve secret",
				slog.String("secret_name", req.SecretName),
				slog.String("namespace", namespace),
				"error", err,
			)
			app.badRequestResponse(w, r, fmt.Errorf("failed to resolve secret %q: %w", req.SecretName, err))
			return
		}
		secretValue = resolved
	}

	app.logger.Info("verify-connection: probing endpoint",
		slog.String("source_type", req.SourceType),
		slog.String("base_url", sanitizeURL(req.BaseURL)),
		slog.Bool("has_secret", secretValue != ""),
		slog.String("model_id", req.ModelID),
	)

	client, err := connectionprobe.NewConnectionProbeClient(
		app.logger,
		req.BaseURL,
		secretValue,
		req.SourceType,
		&connectionprobe.ClientOptions{
			AllowHTTP:           app.config.DevMode || app.config.InsecureSkipVerify,
			SkipSSRFValidation:  app.config.DevMode,
			SkipTLSVerification: app.config.InsecureSkipVerify,
			RootCAs:             app.rootCAs,
		},
	)
	if err != nil {
		if probeErr, ok := err.(*connectionprobe.ConnectionProbeError); ok {
			app.logger.Warn("verify-connection: client creation failed",
				slog.String("code", probeErr.Code),
				slog.String("message", probeErr.Message),
			)
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.logger.Error("verify-connection: unexpected client error", "error", err)
		app.serverErrorResponse(w, r, err)
		return
	}

	response, err := client.Probe(ctx, req)
	if err != nil {
		if probeErr, ok := err.(*connectionprobe.ConnectionProbeError); ok {
			app.logger.Warn("verify-connection: probe failed",
				slog.String("code", probeErr.Code),
				slog.String("base_url", sanitizeURL(req.BaseURL)),
			)
			httpError := &HTTPError{
				StatusCode: probeErr.StatusCode,
				Error:      ErrorPayload{Code: probeErr.Code, Message: probeErr.Message},
			}
			app.errorResponse(w, r, httpError)
			return
		}
		app.logger.Error("verify-connection: unexpected probe error", "error", err)
		app.serverErrorResponse(w, r, err)
		return
	}

	app.logger.Info("verify-connection: probe succeeded",
		slog.String("base_url", sanitizeURL(req.BaseURL)),
		slog.Int("response_time_ms", response.ResponseTime),
	)

	envelope := VerifyConnectionEnvelope{
		Data: *response,
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
