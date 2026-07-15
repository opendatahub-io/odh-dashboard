package asr

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
)

// Client calls an ASR model endpoint for audio transcription.
type Client struct {
	httpClient *http.Client
	logger     *slog.Logger
}

// NewClient creates a reusable ASR client with the given TLS configuration.
func NewClient(logger *slog.Logger, insecureSkipVerify bool, rootCAs *x509.CertPool) *Client {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			MinVersion:         tls.VersionTLS12,
			InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // configurable for dev clusters with self-signed certs
			RootCAs:            rootCAs,
		},
	}

	return &Client{
		httpClient: &http.Client{
			Transport: transport,
			Timeout:   constants.ASRTranscriptionTimeout + 2*time.Second,
		},
		logger: logger,
	}
}

// TranscribeError represents a structured error from an ASR transcription attempt.
type TranscribeError struct {
	Code      int
	ErrorCode string
	Message   string
	Retriable bool
}

func (e *TranscribeError) Error() string { return e.Message }

// Transcribe sends audio to the ASR endpoint and returns the transcription text.
func (c *Client) Transcribe(ctx context.Context, endpoint, modelName string, audioReader io.Reader, contentType, authToken string) (string, error) {
	asrCtx, cancel := context.WithTimeout(ctx, constants.ASRTranscriptionTimeout)
	defer cancel()

	pr, pw := io.Pipe()
	mpWriter := multipart.NewWriter(pw)

	go func() {
		defer pw.Close()

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

	asrURL := strings.TrimSuffix(endpoint, "/") + "/v1/audio/transcriptions"
	asrReq, err := http.NewRequestWithContext(asrCtx, http.MethodPost, asrURL, pr)
	if err != nil {
		pr.Close()
		return "", &TranscribeError{Code: http.StatusBadGateway, ErrorCode: constants.ASRCodeUnreachable, Retriable: true, Message: fmt.Sprintf("failed to create ASR request: %v", err)}
	}
	asrReq.Header.Set("Content-Type", mpWriter.FormDataContentType())
	if authToken != "" {
		asrReq.Header.Set("Authorization", "Bearer "+authToken)
	}

	resp, err := c.httpClient.Do(asrReq)
	if err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(ctx.Err(), context.DeadlineExceeded) {
			return "", &TranscribeError{Code: http.StatusGatewayTimeout, ErrorCode: constants.ASRCodeTimeout, Retriable: true, Message: "ASR transcription timed out"}
		}
		return "", &TranscribeError{Code: http.StatusBadGateway, ErrorCode: constants.ASRCodeUnreachable, Retriable: true, Message: fmt.Sprintf("ASR endpoint unreachable: %v", err)}
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return "", &TranscribeError{Code: resp.StatusCode, ErrorCode: constants.ASRCodeAuthFailed, Message: "ASR model authentication failed — verify AI Asset endpoint access"}
	}

	if resp.StatusCode != http.StatusOK {
		return "", &TranscribeError{Code: http.StatusBadGateway, ErrorCode: constants.ASRCodeServiceError, Retriable: true, Message: fmt.Sprintf("ASR endpoint returned status %d", resp.StatusCode)}
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return "", &TranscribeError{Code: http.StatusBadGateway, ErrorCode: constants.ASRCodeInvalidResponse, Retriable: true, Message: "failed to read ASR response"}
	}

	var asrResp struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(body, &asrResp); err != nil {
		return "", &TranscribeError{Code: http.StatusBadGateway, ErrorCode: constants.ASRCodeInvalidResponse, Retriable: true, Message: "ASR endpoint returned invalid JSON response"}
	}

	if strings.TrimSpace(asrResp.Text) == "" {
		return "", &TranscribeError{Code: http.StatusUnprocessableEntity, ErrorCode: constants.ASRCodeNoSpeech, Message: "No speech detected — try a clearer recording"}
	}

	return asrResp.Text, nil
}

func escapeQuotes(s string) string {
	return strings.ReplaceAll(s, `"`, `\"`)
}
