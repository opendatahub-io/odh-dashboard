package externalmodels

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/models"
)

// chatCompletionRequest represents an OpenAI-compatible chat completion request
type chatCompletionRequest struct {
	Model    string                  `json:"model"`
	Messages []chatCompletionMessage `json:"messages"`
}

// chatCompletionMessage represents a message in the chat completion request
type chatCompletionMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// embeddingRequest represents an OpenAI-compatible embeddings request
type embeddingRequest struct {
	Model      string `json:"model"`
	Input      string `json:"input"`
	Dimensions *int   `json:"dimensions,omitempty"`
}

// ExternalModelsClientInterface defines the interface for external models client operations
type ExternalModelsClientInterface interface {
	VerifyModel(ctx context.Context, modelID string, embeddingDimension *int) (*models.VerifyExternalModelResponse, error)
}

const (
	// maxResponseBodySize limits response body reads to 10MB to prevent memory exhaustion
	maxResponseBodySize = 10 * 1024 * 1024 // 10MB
)

// ClientOptions configures the external models client
type ClientOptions struct {
	// SkipSSRFValidation bypasses SSRF protection (testing only)
	SkipSSRFValidation bool
	// AllowHTTP permits HTTP (non-HTTPS) base URLs; SSRF protection still applies
	AllowHTTP bool
	// SkipTLSVerification skips TLS certificate verification for cluster-local services
	// that use self-signed certificates not present in the system CA pool
	SkipTLSVerification bool
	// RootCAs for TLS verification (defaults to system pool if not provided)
	RootCAs *x509.CertPool
	// TrustedDestinationIPs, when non-empty, pins connections for trusted hosts to
	// these pre-validated addresses (e.g. verified Service backend Pod IPs) instead
	// of resolving the hostname. Used for trusted in-cluster services so neither a
	// DNS rebinding nor Service forwarding can redirect the request to an
	// unvalidated destination.
	TrustedDestinationIPs []string
}

// ExternalModelsClient handles communication with external model endpoints
type ExternalModelsClient struct {
	logger             *slog.Logger
	httpClient         *http.Client
	baseURL            string
	apiKey             string
	modelType          models.ModelTypeEnum
	skipSSRFValidation bool     // For testing only - allows localhost/private IPs
	trustedDestination []string // Pinned destinations dialed directly for trusted hosts
}

// isPrivateIP checks if an IP is a loopback, RFC1918, or unique-local address
// This prevents SSRF attacks targeting internal resources
func isPrivateIP(ip net.IP) bool {
	// Loopback addresses (127.0.0.0/8, ::1)
	if ip.IsLoopback() {
		return true
	}

	// Link-local addresses (169.254.0.0/16, fe80::/10)
	if ip.IsLinkLocalUnicast() {
		return true
	}

	// Check for RFC1918 private IPv4 ranges
	if ip4 := ip.To4(); ip4 != nil {
		// 10.0.0.0/8
		if ip4[0] == 10 {
			return true
		}
		// 172.16.0.0/12
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		// 192.168.0.0/16
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
	}

	// Check for unique-local IPv6 addresses (fc00::/7)
	if len(ip) == net.IPv6len && ip[0] >= 0xfc && ip[0] <= 0xfd {
		return true
	}

	return false
}

// validateBaseURL performs basic URL validation without DNS lookup
// Returns *ExternalModelError for validation failures
func validateBaseURL(baseURL string, allowHTTP bool) error {
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return NewInvalidConfigurationError(baseURL, fmt.Sprintf("Invalid base URL: %v", err))
	}

	if parsedURL.Scheme != "https" && parsedURL.Scheme != "http" {
		return NewInvalidConfigurationError(baseURL, fmt.Sprintf("Base URL must use HTTP or HTTPS scheme, got: %s", parsedURL.Scheme))
	}

	if parsedURL.Scheme != "https" && !allowHTTP {
		return NewInvalidConfigurationError(baseURL, "Base URL must use HTTPS in production")
	}

	if parsedURL.Hostname() == "" {
		return NewInvalidConfigurationError(baseURL, "Base URL must contain a valid hostname")
	}

	return nil
}

// lookupIP is swappable so tests can vary DNS answers between validation and dialing.
var lookupIP = net.LookupIP

// validateRequestSSRF performs SSRF protection at request time (prevents DNS rebinding attacks)
func validateRequestSSRF(hostname string, logger *slog.Logger) error {
	ips, err := lookupIP(hostname)
	if err != nil {
		return fmt.Errorf("failed to resolve hostname %s: %w", hostname, err)
	}

	if len(ips) == 0 {
		return fmt.Errorf("hostname %s resolved to no IP addresses", hostname)
	}

	for _, ip := range ips {
		if isPrivateIP(ip) {
			return fmt.Errorf("request blocked: destination %s resolves to private IP %s (SSRF protection)", hostname, ip.String())
		}
	}

	logger.Debug("SSRF validation passed", "hostname", hostname, "ips", ips)
	return nil
}

// dialValidatedAddresses tries the validated destination addresses in order and
// returns the first successful connection, preserving the multi-address retry and
// address-family fallback that dialing a hostname directly would provide.
// Swappable so tests can simulate per-address failures.
var dialValidatedAddresses = func(ctx context.Context, dialer *net.Dialer, addrs []string) (net.Conn, error) {
	var lastErr error
	for _, addr := range addrs {
		conn, err := dialer.DialContext(ctx, "tcp", addr)
		if err == nil {
			return conn, nil
		}
		lastErr = err
	}
	return nil, lastErr
}

// destinationGuardDialContext returns an http.Transport DialContext that enforces
// the destination policy at connection time. For trusted hosts with pinned
// destinations (validated Service backends) it dials those addresses directly:
// neither a DNS answer nor Service forwarding can then redirect the request to an
// unvalidated destination. For untrusted hosts it resolves the base URL hostname
// at dial time, validates the complete answer against the SSRF policy, and dials
// the validated IPs. The HTTP client otherwise resolves the hostname
// independently, so a changed DNS answer between validation and connection could
// redirect the request to an unchecked destination (time-of-check/time-of-use DNS
// rebinding). Dialing an IP while the transport keeps the hostname preserves the
// HTTP Host header and TLS server name.
func destinationGuardDialContext(
	hostname string,
	trustedDestination []string,
	skipSSRFValidation bool,
	logger *slog.Logger,
) func(ctx context.Context, network, addr string) (net.Conn, error) {
	var pinned []net.IP
	for _, ip := range trustedDestination {
		if parsed := net.ParseIP(ip); parsed != nil {
			pinned = append(pinned, parsed)
		}
	}
	// Configured trusted destinations that parse to no IPs must fail closed:
	// falling through to DNS dialing would bypass the pinning guarantee.
	if len(trustedDestination) > 0 && len(pinned) == 0 {
		return func(_ context.Context, _, _ string) (net.Conn, error) {
			return nil, fmt.Errorf("trusted destinations for %s contain no valid IP addresses: %v", hostname, trustedDestination)
		}
	}
	// Trusted host without pinned destinations (e.g. localhost): dial normally.
	if skipSSRFValidation && len(pinned) == 0 {
		return nil
	}

	dialer := &net.Dialer{Timeout: 10 * time.Second}
	return func(ctx context.Context, _, addr string) (net.Conn, error) {
		_, port, err := net.SplitHostPort(addr)
		if err != nil {
			return nil, fmt.Errorf("failed to parse dial address %s: %w", addr, err)
		}
		if len(pinned) > 0 {
			// Trusted Service: dial the pre-validated backend addresses directly.
			destinations := make([]string, 0, len(pinned))
			for _, ip := range pinned {
				destinations = append(destinations, net.JoinHostPort(ip.String(), port))
			}
			conn, err := dialValidatedAddresses(ctx, dialer, destinations)
			if err != nil {
				return nil, fmt.Errorf("failed to connect to any validated destination for %s (expected one of %v): %w", hostname, trustedDestination, err)
			}
			logger.Debug("dialed pinned trusted destination", "hostname", hostname)
			return conn, nil
		}
		// Untrusted host: validate the complete DNS answer, then try each validated
		// address so an unreachable first answer does not fail the request.
		ips, err := lookupIP(hostname)
		if err != nil {
			return nil, fmt.Errorf("failed to resolve hostname %s: %w", hostname, err)
		}
		if len(ips) == 0 {
			return nil, fmt.Errorf("hostname %s resolved to no IP addresses", hostname)
		}
		destinations := make([]string, 0, len(ips))
		for _, ip := range ips {
			if isPrivateIP(ip) {
				return nil, fmt.Errorf("request blocked: destination %s resolves to private IP %s (SSRF protection)", hostname, ip.String())
			}
			destinations = append(destinations, net.JoinHostPort(ip.String(), port))
		}
		conn, err := dialValidatedAddresses(ctx, dialer, destinations)
		if err != nil {
			return nil, fmt.Errorf("failed to connect to %s: %w", hostname, err)
		}
		logger.Debug("dialed validated destination", "hostname", hostname)
		return conn, nil
	}
}

// NewExternalModelsClient creates a client for verifying external model endpoints
func NewExternalModelsClient(
	logger *slog.Logger,
	baseURL string,
	apiKey string,
	modelType models.ModelTypeEnum,
	opts *ClientOptions,
) (*ExternalModelsClient, error) {
	if opts == nil {
		opts = &ClientOptions{}
	}

	// Basic URL validation (no DNS lookup - SSRF check happens at request time)
	if err := validateBaseURL(baseURL, opts.AllowHTTP || opts.SkipSSRFValidation); err != nil {
		return nil, err
	}

	// Setup TLS certificate pool
	rootCAs := opts.RootCAs
	if rootCAs == nil && !opts.SkipSSRFValidation {
		var err error
		rootCAs, err = x509.SystemCertPool()
		if err != nil {
			// This is an internal server error, not a configuration error
			return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
		}
	}

	// Configure HTTP transport. The dial guard resolves and validates the
	// destination inside DialContext so connection-time DNS cannot diverge from
	// the validated answer (see destinationGuardDialContext).
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return nil, NewInvalidConfigurationError(baseURL, "Base URL could not be parsed")
	}
	dialContext := destinationGuardDialContext(parsedURL.Hostname(), opts.TrustedDestinationIPs, opts.SkipSSRFValidation, logger)
	tlsConfig := &tls.Config{MinVersion: tls.VersionTLS12}
	if opts.SkipTLSVerification {
		// Skip TLS verification for cluster-local URLs
		tlsConfig.InsecureSkipVerify = true //nolint:gosec // cluster-local services use self-signed certs not in the system CA pool
	} else if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}
	var transport http.RoundTripper = &http.Transport{
		TLSClientConfig: tlsConfig,
		DialContext:     dialContext,
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   35 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return http.ErrUseLastResponse // Prevent redirect-based SSRF
		},
	}

	return &ExternalModelsClient{
		logger:             logger,
		httpClient:         httpClient,
		baseURL:            baseURL,
		apiKey:             apiKey,
		modelType:          modelType,
		skipSSRFValidation: opts.SkipSSRFValidation,
		trustedDestination: opts.TrustedDestinationIPs,
	}, nil
}

// buildMinimalWAV creates a valid WAV file with 0.1s of silence (800 samples at
// 8kHz, 8-bit mono). Providers like Groq require minimum audio length (0.01s).
func buildMinimalWAV() []byte {
	numSamples := 800          // 0.1s at 8000 Hz
	dataSize := numSamples     // 1 byte per sample (8-bit mono)
	chunkSize := 36 + dataSize // 36 = header remainder before data bytes
	totalSize := 44 + dataSize

	wav := make([]byte, totalSize)
	copy(wav[0:4], "RIFF")
	binary.LittleEndian.PutUint32(wav[4:8], uint32(chunkSize))
	copy(wav[8:12], "WAVE")
	copy(wav[12:16], "fmt ")
	binary.LittleEndian.PutUint32(wav[16:20], 16)   // Subchunk1Size
	binary.LittleEndian.PutUint16(wav[20:22], 1)    // AudioFormat: PCM
	binary.LittleEndian.PutUint16(wav[22:24], 1)    // NumChannels: mono
	binary.LittleEndian.PutUint32(wav[24:28], 8000) // SampleRate
	binary.LittleEndian.PutUint32(wav[28:32], 8000) // ByteRate
	binary.LittleEndian.PutUint16(wav[32:34], 1)    // BlockAlign
	binary.LittleEndian.PutUint16(wav[34:36], 8)    // BitsPerSample
	copy(wav[36:40], "data")
	binary.LittleEndian.PutUint32(wav[40:44], uint32(dataSize))
	// Fill audio data with silence (0x80 = zero crossing for unsigned 8-bit PCM)
	for i := 44; i < totalSize; i++ {
		wav[i] = 0x80
	}
	return wav
}

var minimalWAV = buildMinimalWAV()

// VerifyModel tests the external model endpoint and validates OpenAI compatibility
func (c *ExternalModelsClient) VerifyModel(ctx context.Context, modelID string, embeddingDimension *int) (*models.VerifyExternalModelResponse, error) {
	startTime := time.Now()

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	if c.modelType == models.ModelTypeTranscription {
		return c.verifyTranscriptionModel(ctx, modelID, startTime)
	}

	// Build test request based on model type using typed OpenAI-compatible structs
	var requestBody []byte
	var endpoint string
	var err error

	if c.modelType == models.ModelTypeLLM {
		endpoint = "/chat/completions"
		chatReq := chatCompletionRequest{
			Model: modelID,
			Messages: []chatCompletionMessage{
				{Role: "user", Content: "test"},
			},
		}
		requestBody, err = json.Marshal(chatReq)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to marshal chat request: %v", err))
		}
	} else {
		endpoint = "/v1/embeddings"
		embeddingReq := embeddingRequest{
			Model:      modelID,
			Input:      "test",
			Dimensions: embeddingDimension,
		}
		requestBody, err = json.Marshal(embeddingReq)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to marshal embedding request: %v", err))
		}
	}

	fullURL := strings.TrimSuffix(c.baseURL, "/") + endpoint
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(requestBody))
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create request: %v", err))
	}

	if c.apiKey != "" && req.URL.Scheme == "https" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	}
	req.Header.Set("Content-Type", "application/json")

	// SSRF protection at request time; trusted hosts with pinned destinations are
	// enforced by the dial guard dialing only those addresses.
	if !c.skipSSRFValidation {
		parsedURL, err := url.Parse(fullURL)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to parse request URL: %v", err))
		}
		if err := validateRequestSSRF(parsedURL.Hostname(), c.logger); err != nil {
			return nil, NewConnectionError(c.baseURL, err.Error())
		}
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, NewTimeoutError(c.baseURL)
		}
		return nil, NewConnectionError(c.baseURL, err.Error())
	}
	defer resp.Body.Close()

	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	responseBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to read response: %v", err))
	}

	if int64(len(responseBody)) == maxResponseBodySize {
		extraByte := make([]byte, 1)
		n, _ := resp.Body.Read(extraByte)
		if n > 0 {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Response body exceeded maximum size of %d bytes", maxResponseBodySize))
		}
	}

	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		// Success
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, NewUnauthorizedError(c.baseURL)
	default:
		errorMsg := fmt.Sprintf("Request to %s returned HTTP %d", fullURL, resp.StatusCode)
		responseStr := strings.TrimSpace(string(responseBody))
		if responseStr != "" {
			errorMsg += fmt.Sprintf(": %s", responseStr)
		} else if resp.StatusCode == http.StatusNotFound {
			errorMsg += ". The endpoint may not exist or the base URL may be incorrect. Verify the base URL points to an OpenAI-compatible API."
		}
		return nil, NewConnectionError(c.baseURL, errorMsg)
	}

	if c.modelType == models.ModelTypeLLM {
		var chatCompletion openai.ChatCompletion
		if err := json.Unmarshal(responseBody, &chatCompletion); err != nil {
			return nil, NewNotOpenAICompatibleError(c.baseURL,
				fmt.Sprintf("Response is not valid JSON: %v", err))
		}
	} else {
		var embeddingResponse openai.CreateEmbeddingResponse
		if err := json.Unmarshal(responseBody, &embeddingResponse); err != nil {
			return nil, NewNotOpenAICompatibleError(c.baseURL,
				fmt.Sprintf("Response is not valid JSON: %v", err))
		}
	}

	elapsed := int(time.Since(startTime).Milliseconds())
	return &models.VerifyExternalModelResponse{
		Success:      true,
		Message:      "External model verified successfully",
		ResponseTime: elapsed,
	}, nil
}

// verifyTranscriptionModel sends a minimal WAV file to /audio/transcriptions via multipart form
func (c *ExternalModelsClient) verifyTranscriptionModel(ctx context.Context, modelID string, startTime time.Time) (*models.VerifyExternalModelResponse, error) {
	endpoint := "/audio/transcriptions"
	fullURL := strings.TrimSuffix(c.baseURL, "/") + endpoint

	// SSRF protection at request time; trusted hosts with pinned destinations are
	// enforced by the dial guard dialing only those addresses.
	if !c.skipSSRFValidation {
		parsedURL, err := url.Parse(fullURL)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to parse request URL: %v", err))
		}
		if err := validateRequestSSRF(parsedURL.Hostname(), c.logger); err != nil {
			return nil, NewConnectionError(c.baseURL, err.Error())
		}
	}

	// Build multipart form body with minimal WAV
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	filePart, err := writer.CreateFormFile("file", "verify.wav")
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create multipart form: %v", err))
	}
	if _, err := filePart.Write(minimalWAV); err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to write WAV data: %v", err))
	}

	if err := writer.WriteField("model", modelID); err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to write model field: %v", err))
	}
	if err := writer.Close(); err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to finalize multipart form: %v", err))
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, &buf)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create request: %v", err))
	}

	if c.apiKey != "" && req.URL.Scheme == "https" {
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.apiKey))
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, NewTimeoutError(c.baseURL)
		}
		return nil, NewConnectionError(c.baseURL, err.Error())
	}
	defer resp.Body.Close()

	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	responseBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to read response: %v", err))
	}

	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated:
		// Success
	case http.StatusUnauthorized, http.StatusForbidden:
		return nil, NewUnauthorizedError(c.baseURL)
	default:
		errorMsg := fmt.Sprintf("Request to %s returned HTTP %d", fullURL, resp.StatusCode)
		responseStr := strings.TrimSpace(string(responseBody))
		if responseStr != "" {
			errorMsg += fmt.Sprintf(": %s", responseStr)
		} else if resp.StatusCode == http.StatusNotFound {
			errorMsg += ". The endpoint may not support /audio/transcriptions. Verify the base URL points to a Whisper-compatible API."
		}
		return nil, NewConnectionError(c.baseURL, errorMsg)
	}

	// Validate response has a "text" field (OpenAI transcription response format)
	var transcriptionResp struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(responseBody, &transcriptionResp); err != nil {
		return nil, NewNotOpenAICompatibleError(c.baseURL,
			fmt.Sprintf("Response is not valid transcription JSON: %v", err))
	}

	elapsed := int(time.Since(startTime).Milliseconds())
	return &models.VerifyExternalModelResponse{
		Success:      true,
		Message:      "Transcription model verified successfully",
		ResponseTime: elapsed,
	}, nil
}
