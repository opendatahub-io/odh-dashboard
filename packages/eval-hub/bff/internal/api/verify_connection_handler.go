package api

import (
	"bytes"
	"context"
	"crypto/x509"
	"encoding/pem"
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

type secretConnectionCredentials struct {
	apiKey string
	caCert []byte
}

// resolveSecretConnectionCredentials reads the API key and optional CA certificate
// from a Secret using the caller's bearer token so RBAC is enforced.
func resolveSecretConnectionCredentials(ctx context.Context, token, namespace, secretName string, logger *slog.Logger) (secretConnectionCredentials, error) {
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		return secretConnectionCredentials{}, fmt.Errorf("failed to get kubeconfig: %w", err)
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
		return secretConnectionCredentials{}, fmt.Errorf("failed to create Kubernetes client: %w", err)
	}

	secret, err := clientset.CoreV1().Secrets(namespace).Get(ctx, secretName, metav1.GetOptions{})
	if err != nil {
		return secretConnectionCredentials{}, fmt.Errorf("failed to get secret %q in namespace %q: %w", secretName, namespace, err)
	}

	apiKey, ok := secret.Data["api-key"]
	if !ok || len(apiKey) == 0 {
		return secretConnectionCredentials{}, fmt.Errorf("secret %q does not contain an \"api-key\" data field", secretName)
	}

	logger.Debug("resolved API key from secret", slog.String("secret", secretName), slog.String("namespace", namespace))
	return secretConnectionCredentials{apiKey: string(apiKey), caCert: secret.Data["ca_cert"]}, nil
}

func rootCAsWithSecretCert(configured *x509.CertPool, caCert []byte) (*x509.CertPool, error) {
	if len(caCert) == 0 {
		return configured, nil
	}

	var roots *x509.CertPool
	if configured != nil {
		roots = configured.Clone()
	} else {
		var err error
		roots, err = x509.SystemCertPool()
		if err != nil {
			return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
		}
	}
	if roots == nil {
		roots = x509.NewCertPool()
	}
	addedCA := false
	for len(bytes.TrimSpace(caCert)) > 0 {
		caCert = bytes.TrimSpace(caCert)
		const beginMarker = "-----BEGIN "
		if !bytes.HasPrefix(caCert, []byte(beginMarker)) {
			return nil, fmt.Errorf("ca_cert contains invalid PEM data")
		}

		// Decode one block at a time. pem.Decode searches forward for a valid block,
		// so bound its input at the next BEGIN marker and reject skipped content.
		blockEnd := bytes.Index(caCert[len(beginMarker):], []byte(beginMarker))
		if blockEnd < 0 {
			blockEnd = len(caCert)
		} else {
			blockEnd += len(beginMarker)
		}
		block, remaining := pem.Decode(caCert[:blockEnd])
		if block == nil || len(bytes.TrimSpace(remaining)) > 0 {
			return nil, fmt.Errorf("ca_cert contains invalid PEM data")
		}
		caCert = caCert[blockEnd:]
		if block.Type != "CERTIFICATE" {
			return nil, fmt.Errorf("ca_cert contains a non-certificate PEM block")
		}
		cert, err := x509.ParseCertificate(block.Bytes)
		if err != nil {
			return nil, fmt.Errorf("ca_cert contains an invalid certificate: %w", err)
		}
		if !cert.IsCA || !cert.BasicConstraintsValid || (cert.KeyUsage != 0 && cert.KeyUsage&x509.KeyUsageCertSign == 0) {
			continue
		}
		roots.AddCert(cert)
		addedCA = true
	}
	if !addedCA {
		return nil, fmt.Errorf("ca_cert does not contain a CA certificate")
	}
	return roots, nil
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

	// Resolve secret_name → API key and optional CA certificate from the Kubernetes Secret.
	secretValue := req.SecretValue
	probeRootCAs := app.rootCAs
	if req.SecretName != "" {
		namespace, _ := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		identity, _ := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
		if identity == nil || identity.Token == "" {
			app.serverErrorResponse(w, r, fmt.Errorf("missing user identity for secret lookup"))
			return
		}

		credentials, err := resolveSecretConnectionCredentials(ctx, identity.Token, namespace, req.SecretName, app.logger)
		if err != nil {
			app.logger.Warn("verify-connection: failed to resolve secret",
				slog.String("secret_name", req.SecretName),
				slog.String("namespace", namespace),
				"error", err,
			)
			app.badRequestResponse(w, r, fmt.Errorf("failed to resolve secret %q: %w", req.SecretName, err))
			return
		}
		secretValue = credentials.apiKey
		probeRootCAs, err = rootCAsWithSecretCert(app.rootCAs, credentials.caCert)
		if err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid ca_cert in secret %q: %w", req.SecretName, err))
			return
		}
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
			RootCAs:             probeRootCAs,
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
