package pipelineserver

import (
	"crypto/tls"
	"crypto/x509"
	"net/http"
	"time"
)

// PipelineServerClientFactory creates pipeline server clients
type PipelineServerClientFactory interface {
	CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) PipelineServerClientInterface
}

// RealClientFactory creates real HTTP-based pipeline server clients
type RealClientFactory struct{}

// NewRealClientFactory creates a new real client factory
func NewRealClientFactory() *RealClientFactory {
	return &RealClientFactory{}
}

// CreateClient creates a new pipeline server client with the given configuration
func (f *RealClientFactory) CreateClient(baseURL string, authToken string, insecureSkipVerify bool, rootCAs *x509.CertPool) PipelineServerClientInterface {
	httpClient := &http.Client{
		Timeout: 30 * time.Second,
		Transport: &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: insecureSkipVerify,
				RootCAs:            rootCAs,
			},
		},
	}

	return NewRealPipelineServerClient(baseURL, authToken, httpClient)
}
