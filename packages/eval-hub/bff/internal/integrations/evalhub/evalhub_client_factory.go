package evalhub

import "crypto/x509"

// EvalHubClientFactory creates EvalHub clients.
type EvalHubClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) EvalHubClientInterface
}

// RealClientFactory creates real EvalHub clients.
type RealClientFactory struct{}

func NewRealClientFactory() EvalHubClientFactory {
	return &RealClientFactory{}
}

func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool, apiPath string) EvalHubClientInterface {
	return NewEvalHubClient(baseURL, authToken, insecureSkipVerify, rootCAs, apiPath)
}
