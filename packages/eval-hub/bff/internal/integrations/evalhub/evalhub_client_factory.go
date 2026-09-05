package evalhub

import (
	"crypto/x509"
	"net/http"
)

// EvalHubClientFactory creates EvalHub clients.
type EvalHubClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) EvalHubClientInterface
}

// RealClientFactory creates real EvalHub clients.
type RealClientFactory struct {
	wrapTransport func(http.RoundTripper) http.RoundTripper
}

func NewRealClientFactory() EvalHubClientFactory {
	return NewRealClientFactoryWithTransport(nil)
}

// NewRealClientFactoryWithTransport creates a real client factory with an optional HTTP transport wrapper.
func NewRealClientFactoryWithTransport(wrapTransport func(http.RoundTripper) http.RoundTripper) EvalHubClientFactory {
	return &RealClientFactory{wrapTransport: wrapTransport}
}

func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) EvalHubClientInterface {
	return NewEvalHubClientWithTransport(baseURL, authToken, insecureSkipVerify, rootCAs, apiPath, f.wrapTransport)
}
