package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"slices"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
)

// maxRelayBodyBytes caps the relayed request body at 1 MB, consistent with the
// sibling responses passthrough endpoint.
const maxRelayBodyBytes int64 = 1_048_576

// relayTimeout is a safety-net deadline for stuck relay connections. Target
// services enforce their own shorter limits (the AutoRAG responses endpoint
// caps requests at 2 minutes and emits its own SSE error event first), so this
// only fires when the connection itself hangs.
const relayTimeout = 3 * time.Minute

// relayTargetPrefixes lists the gateway path prefixes the relay may forward
// to. The relay serves embedder responses endpoints (the embedded gen-ai
// playground in AutoRAG), not arbitrary same-origin paths; adding a
// destination is a deliberate, reviewed change to this list.
var relayTargetPrefixes = []string{"/autorag/"}

// ResponsesRelayHandler handles POST /api/v1/lsd/responses/relay.
//
// This endpoint serves embedder-controlled targets for the embedded playground
// (e.g. AutoRAG's responsesEndpointUrl prop): the request body is forwarded
// verbatim to the same-origin path given by the required "target" query
// parameter, resolved against the externally accessed gateway route
// (https://{GATEWAY_DOMAIN}{target}). The user's bearer token is attached and
// the response — including SSE streams and non-200 error envelopes — is piped
// back transparently, with no synthetic events added.
//
// There is deliberately no namespace parameter and no SSAR middleware: the
// relay performs no Kubernetes operations, and the embedded namespace belongs
// to the target service (a gen-ai CanListOGXServers check would wrongly reject
// AutoRAG users without OGX permissions). Authorization is delegated to the
// target: the requesting user's own token is forwarded, and kube-rbac-proxy
// (TokenReview), the host-backend module proxy, and the target BFF's own SSAR
// all re-authenticate it. The relay therefore grants nothing the user could
// not do directly through the gateway — same origin, same token.
//
// The target is untrusted input (any external URL could be set in the embedded
// playground props), so only same-origin paths under the allowed module
// prefixes (relayTargetPrefixes) are accepted and the host always comes from
// GATEWAY_DOMAIN, never from the request.
//
// Auth is required. Like the genai-proxy endpoints, this returns 401 when no
// bearer identity is present, including under --auth-method=disabled.
func (app *App) ResponsesRelayHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	// Defense-in-depth: middleware enforces auth, but verify identity is present.
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil || identity.Token == "" {
		app.unauthorizedResponse(w, r, errors.New("missing authentication identity"))
		return
	}

	// Validate the target as a same-origin path before anything else so
	// misconfigured deployments surface as 503 rather than masking bad input.
	target := r.URL.Query().Get("target")
	if target == "" {
		app.badRequestResponse(w, r, errors.New("missing required query parameter: target"))
		return
	}
	if !strings.HasPrefix(target, "/") || strings.HasPrefix(target, "//") {
		app.badRequestResponse(w, r, errors.New("target must be a same-origin path starting with a single '/'"))
		return
	}
	parsedTarget, err := url.Parse(target)
	if err != nil || parsedTarget.Scheme != "" || parsedTarget.Host != "" {
		app.badRequestResponse(w, r, errors.New("target must be a same-origin path, not an absolute URL"))
		return
	}
	// Dot segments and backslashes normalize differently across gateway and
	// router layers, so the effective destination could differ from the
	// literal path. Require a canonical path; url.Parse decodes the path, so
	// percent-encoded traversal (e.g. %2e%2e) is caught here as well.
	if path.Clean(parsedTarget.Path) != parsedTarget.Path || strings.Contains(parsedTarget.Path, "\\") {
		app.badRequestResponse(w, r, errors.New("target must be a canonical path without dot segments or backslashes"))
		return
	}
	// Control characters cannot appear raw (url.Parse rejects them), but they
	// can arrive percent-encoded and decode into Path.
	if strings.ContainsFunc(parsedTarget.Path, func(r rune) bool { return r < 0x20 || r == 0x7f }) {
		app.badRequestResponse(w, r, errors.New("target must not contain control characters"))
		return
	}
	// Restrict the relay to the module prefixes that actually serve responses
	// endpoints; it is not a general same-origin proxy.
	if !slices.ContainsFunc(relayTargetPrefixes, func(prefix string) bool {
		return strings.HasPrefix(parsedTarget.Path, prefix)
	}) {
		app.badRequestResponse(w, r, errors.New("target path is not an allowed relay destination"))
		return
	}

	if app.config.GatewayDomain == "" {
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusServiceUnavailable,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "service_unavailable",
				Message: "relay target gateway is not configured (GATEWAY_DOMAIN)",
			},
		})
		return
	}

	// Read the body verbatim — no parsing and no mutation. The target endpoint
	// enforces its own request contract (unknown properties, required fields,
	// size limits), which is also why the target travels as a query parameter
	// rather than a body field.
	r.Body = http.MaxBytesReader(w, r.Body, maxRelayBodyBytes)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, maxRelayBodyBytes)
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("failed to read request body: %w", err))
		return
	}

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported by client", http.StatusNotImplemented)
		return
	}

	requestCtx, cancel := context.WithTimeout(ctx, relayTimeout)
	defer cancel()

	// Build from the validated parsed components rather than the raw target,
	// so the wire request carries exactly the validated path (EscapedPath
	// re-encodes anything url.Parse decoded); fragments never reach the wire.
	upstreamURL := "https://" + app.config.GatewayDomain + parsedTarget.EscapedPath()
	if parsedTarget.RawQuery != "" {
		upstreamURL += "?" + parsedTarget.RawQuery
	}
	proxyReq, err := http.NewRequestWithContext(requestCtx, http.MethodPost, upstreamURL, bytes.NewReader(body))
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid relay target: %w", err))
		return
	}
	proxyReq.Header.Set("Authorization", "Bearer "+identity.Token)
	proxyReq.Header.Set("Content-Type", "application/json")
	proxyReq.Header.Set("Accept", "text/event-stream")

	// Dedicated client with no Timeout: a client timeout bounds the entire body
	// read and would truncate a long stream after WriteHeader has committed.
	// Reuse the app-level TLS transport for connection pooling and cert trust.
	proxyClient := &http.Client{Transport: app.httpClient.Transport}

	resp, err := proxyClient.Do(proxyReq)
	if err != nil {
		// Log the transport error server-side only; the response must not leak
		// internal details (gateway address, dial/TLS specifics).
		app.logger.Error("Relay upstream request failed", "target", parsedTarget.Path, "error", err)
		app.errorResponse(w, r, &integrations.HTTPError{
			StatusCode: http.StatusBadGateway,
			ErrorResponse: integrations.ErrorResponse{
				Code:    "502",
				Message: "relay target unreachable",
			},
		})
		return
	}
	defer resp.Body.Close()

	// Transparent pipe: forward only these response headers, then stream the
	// bytes through unchanged — including non-200 error envelopes, so
	// consumer-side structured error handling keeps working. No synthetic SSE
	// events or metrics are added.
	if contentType := resp.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	if cacheControl := resp.Header.Get("Cache-Control"); cacheControl != "" {
		w.Header().Set("Cache-Control", cacheControl)
	}
	if accelBuffering := resp.Header.Get("X-Accel-Buffering"); accelBuffering != "" {
		w.Header().Set("X-Accel-Buffering", accelBuffering)
	}
	w.WriteHeader(resp.StatusCode)
	buf := make([]byte, 4096)
	for {
		n, readErr := resp.Body.Read(buf)
		if n > 0 {
			if _, writeErr := w.Write(buf[:n]); writeErr != nil {
				return
			}
			flusher.Flush()
		}
		if readErr != nil {
			if !errors.Is(readErr, io.EOF) {
				app.logger.Warn("Relay upstream stream read failed", "target", parsedTarget.Path, "error", readErr)
			}
			break
		}
	}
}
