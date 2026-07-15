package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/asr"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// AudioTranscriptionRequest is the JSON body for POST /lsd/audio/transcriptions.
type AudioTranscriptionRequest struct {
	FileID       string `json:"file_id"`
	ASRModelID   string `json:"asr_model_id"`
	Subscription string `json:"subscription,omitempty"`
}

// AudioTranscriptionResponse is returned on successful transcription.
type AudioTranscriptionResponse struct {
	Text string `json:"text"`
}

// LlamaStackAudioTranscriptionHandler handles POST /gen-ai/api/v1/lsd/audio/transcriptions.
// It retrieves audio from OGX Files API, validates the format, and forwards it
// to a user-selected ASR AI Asset endpoint for transcription.
func (app *App) LlamaStackAudioTranscriptionHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()

	var req AudioTranscriptionRequest
	if err := app.ReadJSON(w, r, &req); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	if req.FileID == "" {
		app.badRequestResponse(w, r, errors.New("file_id is required"))
		return
	}
	if err := llamastack.ValidateFileID(req.FileID); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	if req.ASRModelID == "" {
		app.badRequestResponse(w, r, errors.New("asr_model_id is required"))
		return
	}

	namespace, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, errors.New("missing namespace in context"))
		return
	}

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*integrations.RequestIdentity)
	if !ok || identity == nil {
		app.unauthorizedResponse(w, r, errors.New("missing request identity"))
		return
	}

	// Resolve endpoint and auth token — MaaS vs namespace logic is encapsulated here.
	endpoint, modelName, authToken, err := app.resolveASRModel(ctx, identity, namespace, req.ASRModelID, req.Subscription)
	if err != nil {
		app.handleASRResolutionError(w, r, err)
		return
	}

	client, ok := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, errors.New("OGX client not available"))
		return
	}

	transcriptionCtx, cancel := context.WithTimeout(ctx, constants.AudioTranscriptionTotalTimeout)
	defer cancel()

	retrievalCtx, retrievalCancel := context.WithTimeout(transcriptionCtx, constants.OGXFileRetrievalTimeout)
	defer retrievalCancel()

	body, contentType, err := client.GetFileContent(retrievalCtx, req.FileID)
	if err != nil {
		app.handleFileRetrievalError(w, r, err)
		return
	}
	defer body.Close()

	limitedBody := &maxSizeReader{r: body, maxBytes: constants.AudioUploadMaxBodySize}

	validatedReader, err := validateAudioMagicBytes(limitedBody)
	if err != nil {
		frontendErr := &integrations.FrontendErrorResponse{
			StatusCode: http.StatusBadRequest,
			Error: &integrations.ErrorDetail{
				Component: llamastack.ComponentASR,
				Code:      constants.ASRCodeInvalidFormat,
				Message:   err.Error(),
				Retriable: false,
			},
		}
		if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(frontendErr.StatusCode)
		}
		return
	}

	transcription, err := app.asrClient.Transcribe(transcriptionCtx, endpoint, modelName, validatedReader, contentType, authToken)
	if err != nil {
		app.handleASRCallError(w, r, err)
		return
	}

	resp := AudioTranscriptionResponse{Text: transcription}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// resolveASRModel looks up the ASR model, validates it, resolves the endpoint URL,
// and returns the appropriate auth token (OAuth passthrough for namespace models,
// ephemeral API key for MaaS models). The caller is source-type-agnostic.
// subscriptionHint is the frontend-supplied subscription; if non-empty the BFF lookup is skipped.
func (app *App) resolveASRModel(ctx context.Context, identity *integrations.RequestIdentity, namespace, modelID, subscriptionHint string) (endpoint, modelName, authToken string, err error) {
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	aaModels, err := k8sClient.GetAAModels(ctx, identity, namespace)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to list models: %w", err)
	}

	var found *models.AAModel
	var subscription string
	for i := range aaModels {
		if aaModels[i].ModelID == modelID || aaModels[i].ModelName == modelID {
			found = &aaModels[i]
			break
		}
	}

	// Fallback: check MaaS models if not found in namespace.
	if found == nil {
		maasModels, maasErr := app.fetchMaaSModels(ctx, namespace)
		if maasErr == nil {
			for i := range maasModels {
				if maasModels[i].ModelID == modelID || maasModels[i].ModelName == modelID {
					found = &maasModels[i]
					break
				}
			}
		}
		if found != nil {
			if subscriptionHint != "" {
				subscription = subscriptionHint
			} else {
				subscription = app.lookupMaaSSubscription(ctx, modelID)
			}
		}
	}

	if found == nil {
		return "", "", "", &asrResolutionError{code: http.StatusNotFound, errorCode: constants.ASRCodeModelNotFound, msg: fmt.Sprintf("ASR model %q not found in namespace %q", modelID, namespace)}
	}

	// SSRF prevention: only namespace-deployed (ISVC/LLMISVC) and MaaS models are allowed.
	if found.ModelSourceType != models.ModelSourceTypeNamespace && found.ModelSourceType != models.ModelSourceTypeMaaS {
		return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("ASR model %q must be a namespace-deployed or MaaS model, got %q", modelID, found.ModelSourceType)}
	}

	if !slices.Contains(found.Capabilities, constants.CapabilityAudioTranscription) {
		return "", "", "", &asrResolutionError{code: http.StatusNotFound, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("model %q does not have audio-transcription capability", modelID)}
	}

	if found.Status != models.ModelStatusRunning {
		return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNotRunning, retriable: true, msg: fmt.Sprintf("ASR model %q is not running (status: %s)", modelID, found.Status)}
	}

	// Resolve endpoint URL based on model source type
	if app.config.AsrModelURL != "" {
		endpoint = app.config.AsrModelURL
	} else if found.ModelSourceType == models.ModelSourceTypeMaaS {
		endpoint = extractMaaSEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("MaaS ASR model %q has no gateway endpoint available", modelID)}
		}
	} else {
		endpoint = extractInternalEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("ASR model %q has no internal endpoint available", modelID)}
		}
	}

	// Resolve auth token based on model source type
	if found.ModelSourceType == models.ModelSourceTypeMaaS {
		maasToken := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, found.ModelID, subscription)
		if maasToken == "" {
			return "", "", "", &asrResolutionError{code: http.StatusUnauthorized, errorCode: constants.ASRCodeAuthFailed, retriable: true, msg: "Failed to obtain MaaS API key for ASR model — verify subscription access"}
		}
		authToken = maasToken
	} else {
		authToken = identity.Token
	}

	return endpoint, found.ModelID, authToken, nil
}

// lookupMaaSSubscription fetches the MaaS models from the BFF and returns
// the first subscription name for the given model ID. Returns "" if none found.
func (app *App) lookupMaaSSubscription(ctx context.Context, modelID string) string {
	maasClient := bffclient.GetClient(ctx, bffclient.BFFTargetMaaS)
	if maasClient == nil {
		return ""
	}
	var bffResponse models.MaaSBFFModelsResponse
	if err := maasClient.Call(ctx, "GET", "/models", nil, &bffResponse); err != nil {
		app.logger.Warn("Failed to fetch MaaS models for subscription lookup", "model", modelID, "error", err)
		return ""
	}
	for _, m := range bffResponse.Data.Data {
		if m.ID == modelID && len(m.Subscriptions) > 0 {
			return m.Subscriptions[0].Name
		}
	}
	return ""
}

// validateAudioMagicBytes reads the first bytes from the reader to verify
// the file is WAV or MP3 format. Returns an io.Reader that includes the peeked bytes.
func validateAudioMagicBytes(r io.Reader) (io.Reader, error) {
	header := make([]byte, 12)
	n, err := io.ReadFull(r, header)
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		return nil, fmt.Errorf("failed to read audio file header: %w", err)
	}
	header = header[:n]

	if n < 4 {
		return nil, errors.New("audio file too small to identify format")
	}

	if isWAV(header) || isMP3(header) || isID3(header) {
		return io.MultiReader(io.LimitReader(readerFromBytes(header), int64(n)), r), nil
	}

	return nil, errors.New("unsupported audio format; only WAV and MP3 are accepted")
}

func isWAV(header []byte) bool {
	if len(header) < 12 {
		return false
	}
	return string(header[0:4]) == "RIFF" && string(header[8:12]) == "WAVE"
}

func isMP3(header []byte) bool {
	if len(header) < 2 {
		return false
	}
	if header[0] != 0xFF {
		return false
	}
	// MPEG frame sync: top 3 bits of byte 2 must be set (0xE0 mask)
	return (header[1] & 0xE0) == 0xE0
}

// isID3 detects ID3v2 header ("ID3" prefix) present in most real-world MP3 files.
func isID3(header []byte) bool {
	if len(header) < 3 {
		return false
	}
	return string(header[0:3]) == "ID3"
}

type bytesReader struct {
	data []byte
	pos  int
}

func readerFromBytes(b []byte) io.Reader {
	return &bytesReader{data: b}
}

func (br *bytesReader) Read(p []byte) (n int, err error) {
	if br.pos >= len(br.data) {
		return 0, io.EOF
	}
	n = copy(p, br.data[br.pos:])
	br.pos += n
	return n, nil
}

// extractInternalEndpoint extracts the internal (cluster-local) endpoint URL
// from the AAModel endpoints list. Only internal endpoints are used for ASR
// to prevent routing through ingress (SSRF hardening).
func extractInternalEndpoint(endpoints []string) string {
	for _, ep := range endpoints {
		if strings.HasPrefix(ep, "internal: ") {
			return strings.TrimPrefix(ep, "internal: ")
		}
	}
	return ""
}

// extractMaaSEndpoint returns the gateway endpoint URL for a MaaS model.
// Only https:// and http:// schemes are accepted as SSRF defense-in-depth.
func extractMaaSEndpoint(endpoints []string) string {
	for _, ep := range endpoints {
		if strings.HasPrefix(ep, "https://") || strings.HasPrefix(ep, "http://") {
			return ep
		}
	}
	return ""
}

// Error types for structured error handling

type asrResolutionError struct {
	code      int
	msg       string
	errorCode string
	retriable bool
}

func (e *asrResolutionError) Error() string { return e.msg }

func (app *App) handleASRResolutionError(w http.ResponseWriter, r *http.Request, err error) {
	var resErr *asrResolutionError
	if errors.As(err, &resErr) {
		frontendErr := &integrations.FrontendErrorResponse{
			StatusCode: resErr.code,
			Error: &integrations.ErrorDetail{
				Component: llamastack.ComponentASR,
				Code:      resErr.errorCode,
				Message:   resErr.msg,
				Retriable: resErr.retriable,
			},
		}
		if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(frontendErr.StatusCode)
		}
		return
	}
	app.serverErrorResponse(w, r, err)
}

func (app *App) handleFileRetrievalError(w http.ResponseWriter, r *http.Request, err error) {
	frontendErr := &integrations.FrontendErrorResponse{
		StatusCode: http.StatusBadGateway,
		Error: &integrations.ErrorDetail{
			Component: llamastack.ComponentASR,
			Code:      constants.ASRCodeFileRetrieval,
			Message:   err.Error(),
			Retriable: true,
		},
	}
	if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
		app.LogError(r, writeErr)
		w.WriteHeader(frontendErr.StatusCode)
	}
}

func (app *App) handleASRCallError(w http.ResponseWriter, r *http.Request, err error) {
	var callErr *asr.TranscribeError
	if errors.As(err, &callErr) {
		frontendErr := &integrations.FrontendErrorResponse{
			StatusCode: callErr.Code,
			Error: &integrations.ErrorDetail{
				Component: llamastack.ComponentASR,
				Code:      callErr.ErrorCode,
				Message:   callErr.Message,
				Retriable: callErr.Retriable,
			},
		}
		if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
			app.LogError(r, writeErr)
			w.WriteHeader(frontendErr.StatusCode)
		}
		return
	}
	app.serverErrorResponse(w, r, err)
}

// maxSizeReader wraps a reader and returns an error when more than maxBytes are
// read. Unlike io.LimitReader which silently returns EOF at the limit, this
// returns a descriptive error so callers know the file was oversized rather than
// forwarding truncated content.
type maxSizeReader struct {
	r        io.Reader
	maxBytes int64
	read     int64
}

func (m *maxSizeReader) Read(p []byte) (int, error) {
	n, err := m.r.Read(p)
	m.read += int64(n)
	if m.read > m.maxBytes {
		return n, fmt.Errorf("file size exceeds %d byte limit", m.maxBytes)
	}
	return n, err
}
