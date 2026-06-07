package connectionprobe

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

const (
	maxResponseBodySize = 10 * 1024 * 1024 // 10MB
)

// chatCompletionRequest represents an OpenAI-compatible chat completion request used for probing.
type chatCompletionRequest struct {
	Model    string                  `json:"model"`
	Messages []chatCompletionMessage `json:"messages"`
}

type chatCompletionMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// ClientOptions configures the connection probe client.
type ClientOptions struct {
	SkipSSRFValidation  bool
	AllowHTTP           bool
	SkipTLSVerification bool
	RootCAs             *x509.CertPool
}

// ConnectionProbeClient handles connection verification for evaluation sources.
type ConnectionProbeClient struct {
	logger             *slog.Logger
	httpClient         *http.Client
	baseURL            string
	secretValue        string
	sourceType         string
	skipSSRFValidation bool
}

// isPrivateIP checks if an IP is a loopback, RFC1918, or unique-local address.
func isPrivateIP(ip net.IP) bool {
	if ip.IsLoopback() {
		return true
	}

	if ip.IsLinkLocalUnicast() {
		return true
	}

	if ip4 := ip.To4(); ip4 != nil {
		if ip4[0] == 10 {
			return true
		}
		if ip4[0] == 172 && ip4[1] >= 16 && ip4[1] <= 31 {
			return true
		}
		if ip4[0] == 192 && ip4[1] == 168 {
			return true
		}
	}

	if len(ip) == net.IPv6len && ip[0] >= 0xfc && ip[0] <= 0xfd {
		return true
	}

	return false
}

// isInternalHost returns true when the host belongs to a cluster-internal service
// (*.svc.cluster.local). SSRF protection is skipped for internal hosts.
func isInternalHost(rawURL string) bool {
	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return false
	}
	hostname := parsedURL.Hostname()
	return strings.HasSuffix(hostname, ".svc.cluster.local")
}

func validateBaseURL(baseURL string, allowHTTP bool) error {
	parsedURL, err := url.Parse(baseURL)
	if err != nil {
		return NewConnectionError(baseURL, fmt.Sprintf("Invalid base URL: %v", err))
	}

	if parsedURL.Scheme != "https" && parsedURL.Scheme != "http" {
		return NewConnectionError(baseURL, fmt.Sprintf("Base URL must use HTTP or HTTPS scheme, got: %s", parsedURL.Scheme))
	}

	if parsedURL.Scheme != "https" && !allowHTTP {
		return NewConnectionError(baseURL, "Base URL must use HTTPS in production")
	}

	if parsedURL.Hostname() == "" {
		return NewConnectionError(baseURL, "Base URL must contain a valid hostname")
	}

	return nil
}

func validateRequestSSRF(hostname string, logger *slog.Logger) error {
	ips, err := net.LookupIP(hostname)
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

// NewConnectionProbeClient creates a client for verifying endpoint connectivity.
func NewConnectionProbeClient(
	logger *slog.Logger,
	baseURL string,
	secretValue string,
	sourceType string,
	opts *ClientOptions,
) (*ConnectionProbeClient, error) {
	if opts == nil {
		opts = &ClientOptions{}
	}

	internal := isInternalHost(baseURL)
	allowHTTP := opts.AllowHTTP || opts.SkipSSRFValidation || internal
	if err := validateBaseURL(baseURL, allowHTTP); err != nil {
		return nil, err
	}

	rootCAs := opts.RootCAs
	if rootCAs == nil && !opts.SkipSSRFValidation {
		var err error
		rootCAs, err = x509.SystemCertPool()
		if err != nil {
			return nil, fmt.Errorf("failed to load system certificate pool: %w", err)
		}
	}

	var transport http.RoundTripper
	if opts.SkipTLSVerification || internal {
		transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true, //nolint:gosec // cluster-local services use self-signed certs
				MinVersion:         tls.VersionTLS12,
			},
		}
	} else if rootCAs != nil {
		transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				RootCAs:    rootCAs,
				MinVersion: tls.VersionTLS12,
			},
		}
	}

	httpClient := &http.Client{
		Transport: transport,
		Timeout:   35 * time.Second,
		CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
			return http.ErrUseLastResponse
		},
	}

	return &ConnectionProbeClient{
		logger:             logger,
		httpClient:         httpClient,
		baseURL:            baseURL,
		secretValue:        secretValue,
		sourceType:         sourceType,
		skipSSRFValidation: opts.SkipSSRFValidation || internal,
	}, nil
}

// Probe tests connectivity to the configured endpoint and returns a response on success.
func (c *ConnectionProbeClient) Probe(ctx context.Context, req models.VerifyConnectionRequest) (*models.VerifyConnectionResponse, error) {
	startTime := time.Now()

	ctx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	switch c.sourceType {
	case "model", "agent":
		return c.probeModelEndpoint(ctx, req, startTime)
	case "prerecorded":
		return c.probePrerecordedEndpoint(ctx, req, startTime)
	default:
		return c.probeModelEndpoint(ctx, req, startTime)
	}
}

func (c *ConnectionProbeClient) probeModelEndpoint(ctx context.Context, req models.VerifyConnectionRequest, startTime time.Time) (*models.VerifyConnectionResponse, error) {
	chatReq := chatCompletionRequest{
		Model: "test",
		Messages: []chatCompletionMessage{
			{Role: "user", Content: "test"},
		},
	}
	if req.ModelID != "" {
		chatReq.Model = req.ModelID
	}

	requestBody, err := json.Marshal(chatReq)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to marshal request: %v", err))
	}

	trimmed := strings.TrimSuffix(c.baseURL, "/")
	fullURL := trimmed + "/chat/completions"
	if strings.HasSuffix(trimmed, "/chat/completions") {
		fullURL = trimmed
	}
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, fullURL, bytes.NewReader(requestBody))
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create request: %v", err))
	}

	if c.secretValue != "" && (httpReq.URL.Scheme == "https" || isInternalHost(fullURL)) {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.secretValue))
	}
	httpReq.Header.Set("Content-Type", "application/json")

	return c.executeAndMap(ctx, httpReq, fullURL, startTime)
}

func (c *ConnectionProbeClient) probePrerecordedEndpoint(ctx context.Context, _ models.VerifyConnectionRequest, startTime time.Time) (*models.VerifyConnectionResponse, error) {
	fullURL := strings.TrimSuffix(c.baseURL, "/")
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodHead, fullURL, nil)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to create request: %v", err))
	}

	if c.secretValue != "" && (httpReq.URL.Scheme == "https" || isInternalHost(fullURL)) {
		httpReq.Header.Set("Authorization", fmt.Sprintf("Bearer %s", c.secretValue))
	}

	return c.executeAndMap(ctx, httpReq, fullURL, startTime)
}

func (c *ConnectionProbeClient) executeAndMap(ctx context.Context, httpReq *http.Request, fullURL string, startTime time.Time) (*models.VerifyConnectionResponse, error) {
	if !c.skipSSRFValidation {
		parsedURL, err := url.Parse(fullURL)
		if err != nil {
			return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to parse request URL: %v", err))
		}
		if err := validateRequestSSRF(parsedURL.Hostname(), c.logger); err != nil {
			return nil, NewConnectionError(c.baseURL, err.Error())
		}
	}

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			return nil, NewTimeoutError(c.baseURL)
		}
		return nil, NewConnectionError(c.baseURL, err.Error())
	}
	defer resp.Body.Close()

	// Drain body with size limit
	limitedReader := io.LimitReader(resp.Body, maxResponseBodySize)
	responseBody, err := io.ReadAll(limitedReader)
	if err != nil {
		return nil, NewConnectionError(c.baseURL, fmt.Sprintf("Failed to read response: %v", err))
	}

	switch resp.StatusCode {
	case http.StatusOK, http.StatusCreated, http.StatusNoContent:
		elapsed := int(time.Since(startTime).Milliseconds())
		return &models.VerifyConnectionResponse{
			Success:      true,
			Message:      "Connection verified successfully",
			ResponseTime: elapsed,
		}, nil
	case http.StatusUnauthorized:
		return nil, NewUnauthorizedError(c.baseURL)
	case http.StatusForbidden:
		return nil, NewForbiddenError(c.baseURL)
	default:
		errorMsg := fmt.Sprintf("Request to %s returned HTTP %d", fullURL, resp.StatusCode)
		responseStr := strings.TrimSpace(string(responseBody))
		if responseStr != "" {
			errorMsg += fmt.Sprintf(": %s", responseStr)
		} else if resp.StatusCode == http.StatusNotFound {
			errorMsg += ". The endpoint may not exist or the base URL may be incorrect."
		}
		return nil, NewConnectionError(c.baseURL, errorMsg)
	}
}
