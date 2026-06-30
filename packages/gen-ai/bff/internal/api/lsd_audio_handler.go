package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// AudioTranscriptionRequest is the JSON body for POST /lsd/audio/transcriptions.
type AudioTranscriptionRequest struct {
	FileID     string `json:"file_id"`
	ASRModelID string `json:"asr_model_id"`
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

	// Parse request body
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

	// Get namespace and identity from context
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

	// Resolve ASR model endpoint from K8s
	asrEndpoint, asrModelName, err := app.resolveASRModel(ctx, identity, namespace, req.ASRModelID)
	if err != nil {
		app.handleASRResolutionError(w, r, err)
		return
	}

	// Get the OGX client from context (provides GetFileContent)
	client, ok := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)
	if !ok || client == nil {
		app.serverErrorResponse(w, r, errors.New("OGX client not available"))
		return
	}

	// Apply total timeout for the transcription flow
	transcriptionCtx, cancel := context.WithTimeout(ctx, constants.AudioTranscriptionTotalTimeout)
	defer cancel()

	// Retrieve file content from OGX via the client interface
	retrievalCtx, retrievalCancel := context.WithTimeout(transcriptionCtx, constants.OGXFileRetrievalTimeout)
	defer retrievalCancel()

	body, contentType, err := client.GetFileContent(retrievalCtx, req.FileID)
	if err != nil {
		app.handleFileRetrievalError(w, r, err)
		return
	}
	defer body.Close()

	// Enforce size limit on the retrieved file — error on overflow instead of silently truncating
	limitedBody := &maxSizeReader{r: body, maxBytes: constants.AudioUploadMaxBodySize}

	// Validate audio format via magic bytes
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

	// Forward audio to ASR endpoint
	transcription, err := app.callASREndpoint(transcriptionCtx, asrEndpoint, asrModelName, validatedReader, contentType, identity.Token)
	if err != nil {
		app.handleASRCallError(w, r, err)
		return
	}

	// Return transcription
	resp := AudioTranscriptionResponse{Text: transcription}
	if err := app.WriteJSON(w, http.StatusOK, resp, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// resolveASRModel looks up the ASR model in the namespace, validates it has the
// audio-transcription capability and correct source type, and returns the internal endpoint URL.
func (app *App) resolveASRModel(ctx context.Context, identity *integrations.RequestIdentity, namespace, modelID string) (endpoint string, modelName string, err error) {
	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		return "", "", fmt.Errorf("failed to get Kubernetes client: %w", err)
	}

	aaModels, err := k8sClient.GetAAModels(ctx, identity, namespace)
	if err != nil {
		return "", "", fmt.Errorf("failed to list models: %w", err)
	}

	var found *models.AAModel
	for i := range aaModels {
		if aaModels[i].ModelID == modelID || aaModels[i].ModelName == modelID {
			found = &aaModels[i]
			break
		}
	}

	if found == nil {
		return "", "", &asrResolutionError{code: http.StatusNotFound, errorCode: constants.ASRCodeModelNotFound, msg: fmt.Sprintf("ASR model %q not found in namespace %q", modelID, namespace)}
	}

	// SSRF prevention: only namespace-deployed models (ISVC/LLMISVC) are allowed
	if found.ModelSourceType != models.ModelSourceTypeNamespace {
		return "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("ASR model %q must be a namespace-deployed model (InferenceService), got %q", modelID, found.ModelSourceType)}
	}

	if !slices.Contains(found.Capabilities, constants.CapabilityAudioTranscription) {
		return "", "", &asrResolutionError{code: http.StatusNotFound, errorCode: constants.ASRCodeModelInvalid, msg: fmt.Sprintf("model %q does not have audio-transcription capability", modelID)}
	}

	if found.Status != models.ModelStatusRunning {
		return "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNotRunning, retriable: true, msg: fmt.Sprintf("ASR model %q is not running (status: %s)", modelID, found.Status)}
	}

	// Extract internal endpoint URL (or use developer override)
	if app.config.AsrModelURL != "" {
		endpoint = app.config.AsrModelURL
	} else {
		endpoint = extractInternalEndpoint(found.Endpoints)
		if endpoint == "" {
			return "", "", &asrResolutionError{code: http.StatusBadRequest, errorCode: constants.ASRCodeModelNoEndpoint, msg: fmt.Sprintf("ASR model %q has no internal endpoint available", modelID)}
		}
	}

	return endpoint, found.ModelID, nil
}

// callASREndpoint forwards the audio to the ASR model and returns the transcription text.
func (app *App) callASREndpoint(ctx context.Context, asrEndpoint, modelName string, audioReader io.Reader, contentType, authToken string) (string, error) {
	asrCtx, cancel := context.WithTimeout(ctx, constants.ASRTranscriptionTimeout)
	defer cancel()

	// Build multipart form with io.Pipe for streaming
	pr, pw := io.Pipe()
	mpWriter := multipart.NewWriter(pw)

	go func() {
		defer pw.Close()

		// Abort the pipe if the request context is cancelled
		go func() {
			<-asrCtx.Done()
			pw.CloseWithError(asrCtx.Err())
		}()

		if contentType == "" {
			contentType = "application/octet-stream"
		}

		partHeader := make(map[string][]string)
		partHeader["Content-Disposition"] = []string{fmt.Sprintf(`form-data; name="file"; filename="%s"`, escapeQuotes("audio"))}
		partHeader["Content-Type"] = []string{contentType}

		part, err := mpWriter.CreatePart(partHeader)
		if err != nil {
			pw.CloseWithError(fmt.Errorf("failed to create multipart file part: %w", err))
			return
		}

		if _, err := io.Copy(part, audioReader); err != nil {
			pw.CloseWithError(fmt.Errorf("failed to stream audio to multipart: %w", err))
			return
		}

		if err := mpWriter.WriteField("model", modelName); err != nil {
			pw.CloseWithError(fmt.Errorf("failed to write model field: %w", err))
			return
		}

		if err := mpWriter.Close(); err != nil {
			pw.CloseWithError(fmt.Errorf("failed to close multipart writer: %w", err))
			return
		}
	}()

	// POST to ASR endpoint
	asrURL := strings.TrimSuffix(asrEndpoint, "/") + "/v1/audio/transcriptions"
	asrReq, err := http.NewRequestWithContext(asrCtx, http.MethodPost, asrURL, pr)
	if err != nil {
		pr.Close()
		return "", &asrCallError{code: http.StatusBadGateway, errorCode: constants.ASRCodeUnreachable, retriable: true, msg: fmt.Sprintf("failed to create ASR request: %v", err)}
	}
	asrReq.Header.Set("Content-Type", mpWriter.FormDataContentType())
	if authToken != "" {
		asrReq.Header.Set("Authorization", "Bearer "+authToken)
	}

	asrClient := &http.Client{Timeout: constants.ASRTranscriptionTimeout + 2*time.Second}
	resp, err := asrClient.Do(asrReq)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return "", &asrCallError{code: http.StatusGatewayTimeout, errorCode: constants.ASRCodeTimeout, retriable: true, msg: "ASR transcription timed out"}
		}
		return "", &asrCallError{code: http.StatusBadGateway, errorCode: constants.ASRCodeUnreachable, retriable: true, msg: fmt.Sprintf("ASR endpoint unreachable: %v", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return "", &asrCallError{code: resp.StatusCode, errorCode: constants.ASRCodeAuthFailed, msg: "ASR model authentication failed — verify AI Asset endpoint access"}
	}

	if resp.StatusCode != http.StatusOK {
		return "", &asrCallError{code: http.StatusBadGateway, errorCode: constants.ASRCodeServiceError, retriable: true, msg: fmt.Sprintf("ASR endpoint returned status %d", resp.StatusCode)}
	}

	// Parse response
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20)) // 1MB limit on response
	if err != nil {
		return "", &asrCallError{code: http.StatusBadGateway, errorCode: constants.ASRCodeInvalidResponse, retriable: true, msg: "failed to read ASR response"}
	}

	var asrResp struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &asrResp); err != nil {
		return "", &asrCallError{code: http.StatusBadGateway, errorCode: constants.ASRCodeInvalidResponse, retriable: true, msg: "ASR endpoint returned invalid JSON response"}
	}

	if strings.TrimSpace(asrResp.Text) == "" {
		return "", &asrCallError{code: http.StatusUnprocessableEntity, errorCode: constants.ASRCodeNoSpeech, msg: "No speech detected — try a clearer recording"}
	}

	return asrResp.Text, nil
}

func escapeQuotes(s string) string {
	return strings.ReplaceAll(s, `"`, `\"`)
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

// Error types for structured error handling

type asrResolutionError struct {
	code      int
	msg       string
	errorCode string
	retriable bool
}

func (e *asrResolutionError) Error() string { return e.msg }

type asrCallError struct {
	code      int
	msg       string
	errorCode string
	retriable bool
}

func (e *asrCallError) Error() string { return e.msg }

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
	var callErr *asrCallError
	if errors.As(err, &callErr) {
		frontendErr := &integrations.FrontendErrorResponse{
			StatusCode: callErr.code,
			Error: &integrations.ErrorDetail{
				Component: llamastack.ComponentASR,
				Code:      callErr.errorCode,
				Message:   callErr.msg,
				Retriable: callErr.retriable,
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
