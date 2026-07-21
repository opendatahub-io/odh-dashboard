package api

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"slices"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/openai/openai-go/v2"
	"github.com/openai/openai-go/v2/option"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/bffclient"
	"github.com/opendatahub-io/gen-ai/internal/integrations/kubernetes"
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
		app.writeASRError(w, r, http.StatusBadGateway, constants.ASRCodeFileRetrieval, err.Error(), true)
		return
	}
	defer body.Close()

	limitedBody := &maxSizeReader{r: body, maxBytes: constants.AudioUploadMaxBodySize}

	validatedReader, err := validateAudioMagicBytes(limitedBody)
	if err != nil {
		app.writeASRError(w, r, http.StatusBadRequest, constants.ASRCodeInvalidFormat, err.Error(), false)
		return
	}

	text, err := app.transcribeAudio(transcriptionCtx, endpoint, modelName, authToken, validatedReader, contentType)
	if err != nil {
		app.handleTranscriptionError(w, r, err)
		return
	}

	resp := AudioTranscriptionResponse{Text: text}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// transcribeAudio calls the ASR endpoint using the OpenAI Go SDK.
func (app *App) transcribeAudio(ctx context.Context, endpoint, modelName, authToken string, audioReader io.Reader, contentType string) (string, error) {
	if !strings.HasSuffix(endpoint, "/") {
		endpoint += "/"
	}

	opts := []option.RequestOption{
		option.WithBaseURL(endpoint),
		option.WithAPIKey(authToken),
		option.WithMaxRetries(0),
	}
	if app.httpClient != nil {
		opts = append(opts, option.WithHTTPClient(app.httpClient))
	}

	sdkClient := openai.NewClient(opts...)

	file := &namedReader{
		Reader:      audioReader,
		filename:    filenameFromContentType(contentType),
		contentType: contentType,
	}

	resp, err := sdkClient.Audio.Transcriptions.New(ctx, openai.AudioTranscriptionNewParams{
		File:           file,
		Model:          openai.AudioModel(modelName),
		ResponseFormat: openai.AudioResponseFormatJSON,
	})
	if err != nil {
		return "", err
	}

	if strings.TrimSpace(resp.Text) == "" {
		return "", &asrTranscriptionError{
			code:      http.StatusUnprocessableEntity,
			errorCode: constants.ASRCodeNoSpeech,
			msg:       "No speech detected — try a clearer recording",
		}
	}

	return resp.Text, nil
}

// namedReader wraps an io.Reader and provides filename/content-type metadata
// for the OpenAI SDK's multipart encoder.
type namedReader struct {
	io.Reader
	filename    string
	contentType string
}

func (nr *namedReader) Filename() string    { return nr.filename }
func (nr *namedReader) ContentType() string { return nr.contentType }

// filenameFromContentType maps audio MIME types to filenames with extensions.
// External ASR APIs (e.g. Groq) reject files without a recognized extension.
func filenameFromContentType(ct string) string {
	switch {
	case strings.Contains(ct, "wav"):
		return "audio.wav"
	case strings.Contains(ct, "mpeg"), strings.Contains(ct, "mp3"):
		return "audio.mp3"
	case strings.Contains(ct, "mp4"):
		return "audio.mp4"
	case strings.Contains(ct, "ogg"):
		return "audio.ogg"
	case strings.Contains(ct, "flac"):
		return "audio.flac"
	case strings.Contains(ct, "webm"):
		return "audio.webm"
	case strings.Contains(ct, "m4a"):
		return "audio.m4a"
	default:
		return "audio.wav"
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

	// Only namespace, MaaS, and custom_endpoint models are allowed for ASR.
	switch found.ModelSourceType {
	case models.ModelSourceTypeNamespace, models.ModelSourceTypeMaaS, models.ModelSourceTypeCustomEndpoint:
		// allowed
	default:
		return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("ASR model %q has unsupported source type %q", modelID, found.ModelSourceType)}
	}

	if !slices.Contains(found.Capabilities, constants.CapabilityAudioTranscription) {
		return "", "", "", &asrResolutionError{code: http.StatusNotFound, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("model %q does not have audio-transcription capability", modelID)}
	}

	// Custom endpoint models have no readiness probe; skip the running check for them.
	if found.ModelSourceType != models.ModelSourceTypeCustomEndpoint && found.Status != models.ModelStatusRunning {
		return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNotRunning, retriable: true, msg: fmt.Sprintf("ASR model %q is not running (status: %s)", modelID, found.Status)}
	}

	// Resolve endpoint URL based on model source type.
	// The returned endpoint is a base URL suitable for the OpenAI SDK:
	// - namespace/MaaS/override: bare host → append "/v1/" for SDK path resolution
	// - custom_endpoint: already includes /v1 → use as-is with trailing /
	if app.config.AsrModelURL != "" {
		endpoint = strings.TrimSuffix(app.config.AsrModelURL, "/") + "/v1/"
	} else if found.ModelSourceType == models.ModelSourceTypeCustomEndpoint {
		endpoint = extractMaaSEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("custom endpoint ASR model %q has no endpoint URL available", modelID)}
		}
		// Custom endpoint base_url already includes /v1 (e.g. https://api.groq.com/openai/v1).
		// SDK resolves "audio/transcriptions" relative to this — just ensure trailing slash.
	} else if found.ModelSourceType == models.ModelSourceTypeMaaS {
		endpoint = extractMaaSEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("MaaS ASR model %q has no gateway endpoint available", modelID)}
		}
		endpoint = strings.TrimSuffix(endpoint, "/") + "/v1/"
	} else {
		endpoint = extractInternalEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("ASR model %q has no internal endpoint available", modelID)}
		}
		endpoint = strings.TrimSuffix(endpoint, "/") + "/v1/"
	}

	// Resolve auth token based on model source type
	switch found.ModelSourceType {
	case models.ModelSourceTypeMaaS:
		maasToken := app.getMaaSTokenForModel(ctx, k8sClient, identity, namespace, found.ModelID, subscription)
		if maasToken == "" {
			return "", "", "", &asrResolutionError{code: http.StatusUnauthorized, errorCode: constants.ASRCodeAuthFailed, retriable: true, msg: "Failed to obtain MaaS API key for ASR model — verify subscription access"}
		}
		authToken = maasToken
	case models.ModelSourceTypeCustomEndpoint:
		authToken = app.resolveCustomEndpointASRToken(ctx, k8sClient, identity, namespace, found.ModelID)
	default:
		authToken = identity.Token
	}

	return endpoint, found.ModelID, authToken, nil
}

// resolveCustomEndpointASRToken retrieves the API key for a custom endpoint ASR model
// by looking up the external models ConfigMap and reading the referenced Secret.
// Returns "" when the secret cannot be resolved (the ASR client will attempt the call
// without auth, which the remote endpoint may or may not accept).
func (app *App) resolveCustomEndpointASRToken(ctx context.Context, k8sClient kubernetes.KubernetesClientInterface, identity *integrations.RequestIdentity, namespace, modelID string) string {
	externalModelsConfig, err := k8sClient.GetExternalModelsConfig(ctx, namespace)
	if err != nil {
		app.logger.Warn("Failed to get external models ConfigMap for ASR auth", "model", modelID, "error", err)
		return ""
	}

	var foundModel *models.RegisteredModel
	for i := range externalModelsConfig.RegisteredResources.Models {
		m := &externalModelsConfig.RegisteredResources.Models[i]
		if m.ModelID == modelID {
			foundModel = m
			break
		}
	}
	if foundModel == nil {
		app.logger.Warn("ASR model not found in external models ConfigMap", "model", modelID, "namespace", namespace)
		return ""
	}

	var foundProvider *models.InferenceProvider
	for i := range externalModelsConfig.Providers.Inference {
		if externalModelsConfig.Providers.Inference[i].ProviderID == foundModel.ProviderID {
			foundProvider = &externalModelsConfig.Providers.Inference[i]
			break
		}
	}
	if foundProvider == nil {
		app.logger.Warn("Provider not found for ASR custom endpoint model", "model", modelID, "providerID", foundModel.ProviderID, "namespace", namespace)
		return ""
	}

	return app.fetchSecretFromProvider(ctx, k8sClient, identity, namespace, foundProvider, modelID)
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
		return io.MultiReader(bytes.NewReader(header), r), nil
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
	return (header[1] & 0xE0) == 0xE0
}

func isID3(header []byte) bool {
	if len(header) < 3 {
		return false
	}
	return string(header[0:3]) == "ID3"
}

// extractInternalEndpoint extracts the internal (cluster-local) endpoint URL
// from the AAModel endpoints list.
func extractInternalEndpoint(endpoints []string) string {
	for _, ep := range endpoints {
		if strings.HasPrefix(ep, "internal: ") {
			return strings.TrimPrefix(ep, "internal: ")
		}
	}
	return ""
}

// extractMaaSEndpoint returns the gateway endpoint URL for a MaaS or custom endpoint model.
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

// asrTranscriptionError represents a domain-level transcription error (e.g. no speech).
type asrTranscriptionError struct {
	code      int
	errorCode string
	msg       string
	retriable bool
}

func (e *asrTranscriptionError) Error() string { return e.msg }

func (app *App) handleASRResolutionError(w http.ResponseWriter, r *http.Request, err error) {
	var resErr *asrResolutionError
	if errors.As(err, &resErr) {
		app.writeASRError(w, r, resErr.code, resErr.errorCode, resErr.msg, resErr.retriable)
		return
	}
	app.serverErrorResponse(w, r, err)
}

func (app *App) handleTranscriptionError(w http.ResponseWriter, r *http.Request, err error) {
	var domainErr *asrTranscriptionError
	if errors.As(err, &domainErr) {
		app.writeASRError(w, r, domainErr.code, domainErr.errorCode, domainErr.msg, domainErr.retriable)
		return
	}

	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		switch {
		case apiErr.StatusCode == http.StatusUnauthorized || apiErr.StatusCode == http.StatusForbidden:
			app.writeASRError(w, r, apiErr.StatusCode, constants.ASRCodeAuthFailed, "ASR model authentication failed — verify AI Asset endpoint access", false)
		case apiErr.StatusCode == http.StatusRequestTimeout || apiErr.StatusCode == http.StatusTooManyRequests:
			app.writeASRError(w, r, http.StatusBadGateway, constants.ASRCodeServiceError, fmt.Sprintf("ASR endpoint returned status %d", apiErr.StatusCode), true)
		case apiErr.StatusCode >= 500:
			app.writeASRError(w, r, http.StatusBadGateway, constants.ASRCodeServiceError, fmt.Sprintf("ASR endpoint returned status %d", apiErr.StatusCode), true)
		default:
			app.writeASRError(w, r, apiErr.StatusCode, constants.ASRCodeServiceError, fmt.Sprintf("ASR endpoint returned status %d: check model configuration", apiErr.StatusCode), false)
		}
		return
	}

	if errors.Is(err, context.DeadlineExceeded) {
		app.writeASRError(w, r, http.StatusGatewayTimeout, constants.ASRCodeTimeout, "ASR transcription timed out", true)
		return
	}

	app.writeASRError(w, r, http.StatusBadGateway, constants.ASRCodeUnreachable, fmt.Sprintf("ASR endpoint unreachable: %v", err), true)
}

// writeASRError writes a structured ASR error response to the frontend.
func (app *App) writeASRError(w http.ResponseWriter, r *http.Request, status int, code, message string, retriable bool) {
	frontendErr := &integrations.FrontendErrorResponse{
		StatusCode: status,
		Error: &integrations.ErrorDetail{
			Component: llamastack.ComponentASR,
			Code:      code,
			Message:   message,
			Retriable: retriable,
		},
	}
	if writeErr := app.WriteJSON(w, frontendErr.StatusCode, frontendErr, nil); writeErr != nil {
		app.LogError(r, writeErr)
		w.WriteHeader(frontendErr.StatusCode)
	}
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
