package api

import (
	"context"
	"crypto/x509"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
)

const (
	probeTimeout        = 10 * time.Second // max time for a single probe network operation
	probeQueueTimeout   = 5 * time.Second  // max wait for a semaphore slot before returning 503
	maxConcurrentProbes = 10               // bounds resource usage under load
)

// ProbeContext bundles all dependencies a probe needs.
type ProbeContext struct {
	Ctx                context.Context
	FieldValues        map[string]string
	RootCAs            *x509.CertPool
	InsecureSkipVerify bool
}

// ProbeFunc executes a read-only connectivity check against a data source.
type ProbeFunc func(pc ProbeContext) models.ConnectionTestResult

// probeEntry pairs a real probe with its mock counterpart.
type probeEntry struct {
	real ProbeFunc
	mock ProbeFunc
}

var probeEntries = map[string]probeEntry{
	"s3":  {real: probeS3, mock: mockProbeS3},
	"uri": {real: probeURI, mock: mockProbeURI},
	"oci": {real: probeOCI, mock: mockProbeOCI},
}

func buildRegistry(isMocked bool) map[string]ProbeFunc {
	registry := make(map[string]ProbeFunc, len(probeEntries))
	for key, entry := range probeEntries {
		if isMocked {
			registry[key] = entry.mock
		} else {
			registry[key] = entry.real
		}
	}
	return registry
}

// normalizeConnectionType strips version suffixes (e.g. "uri-v1" → "uri")
// to match probe registry keys when the frontend sends the full ConfigMap name.
func normalizeConnectionType(connType string) string {
	for key := range probeEntries {
		if strings.HasPrefix(connType, key+"-") || strings.HasPrefix(connType, key+"_") {
			return key
		}
	}
	return connType
}

// NewProbeSemaphore creates a semaphore channel for limiting concurrent probes.
func NewProbeSemaphore() chan struct{} {
	return make(chan struct{}, maxConcurrentProbes)
}

// TestConnectionHandler handles POST /api/v1/connections/test.
func (app *App) TestConnectionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	var req models.ConnectionTestRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	connectionType := strings.TrimSpace(req.ConnectionType)
	if connectionType == "" {
		httpError := &HTTPError{
			StatusCode: http.StatusBadRequest,
			Error:      ErrorPayload{Code: "INVALID_REQUEST", Message: "connectionType is required"},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	if req.FieldValues == nil {
		httpError := &HTTPError{
			StatusCode: http.StatusBadRequest,
			Error:      ErrorPayload{Code: "INVALID_REQUEST", Message: "fieldValues is required"},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	registry := buildRegistry(app.config.MockHTTPClient)

	probe, ok := registry[connectionType]
	if !ok {
		probe, ok = registry[normalizeConnectionType(connectionType)]
	}
	if !ok {
		httpError := &HTTPError{
			StatusCode: http.StatusBadRequest,
			Error:      ErrorPayload{Code: "UNSUPPORTED_TYPE", Message: fmt.Sprintf("Connection testing is not yet available for type %q. Supported types: s3, uri, oci", connectionType)},
		}
		app.errorResponse(w, r, httpError)
		return
	}

	// 5s queue timeout: how long to wait for a slot. Separate from the 10s probe
	// timeout which bounds the actual network operation once a slot is acquired.
	select {
	case app.probeSemaphore <- struct{}{}:
		defer func() { <-app.probeSemaphore }()
	case <-time.After(probeQueueTimeout):
		w.Header().Set("Retry-After", "5")
		httpError := &HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			Error:      ErrorPayload{Code: "PROBE_BUSY", Message: "Connection test queue is full, please retry later"},
		}
		app.errorResponse(w, r, httpError)
		return
	case <-r.Context().Done():
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), probeTimeout)
	defer cancel()

	pc := ProbeContext{
		Ctx:                ctx,
		FieldValues:        req.FieldValues,
		RootCAs:            app.rootCAs,
		InsecureSkipVerify: app.config.InsecureSkipVerify,
	}

	result := probe(pc)

	userID := ""
	if identity, ok := r.Context().Value(constants.RequestIdentityKey).(*k8s.RequestIdentity); ok && identity != nil {
		userID = identity.UserID
	}
	app.logger.Info("Connection probe executed",
		slog.String("user_id", userID),
		slog.String("connection_type", connectionType),
		slog.Bool("success", result.Success),
	)

	envelope := Envelope[models.ConnectionTestResult, None]{Data: result}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
