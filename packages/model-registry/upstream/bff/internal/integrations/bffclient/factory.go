package bffclient

import (
	"crypto/tls"
	"crypto/x509"
	"log/slog"
	"net/http"
	"time"
)

// BFFClientFactory interface for creating BFF clients
type BFFClientFactory interface {
	// CreateClient creates a client for the specified target BFF
	CreateClient(target BFFTarget, authToken string) BFFClientInterface

	// CreateClientWithHeaders creates a client with custom headers for the specified target BFF
	CreateClientWithHeaders(target BFFTarget, authToken string, headers map[string]string) BFFClientInterface

	// GetConfig returns the configuration for a specific target
	GetConfig(target BFFTarget) *BFFServiceConfig

	// IsTargetConfigured checks if a target BFF is configured
	IsTargetConfigured(target BFFTarget) bool
}

// RealClientFactory creates real BFF clients with HTTP communication
type RealClientFactory struct {
	config             *BFFClientConfig
	rootCAs            *x509.CertPool
	insecureSkipVerify bool
	logger             *slog.Logger
	// transport is shared across every client this factory creates for connection pooling.
	transport *http.Transport
}

// NewRealClientFactory creates a factory for real BFF clients
func NewRealClientFactory(config *BFFClientConfig, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) BFFClientFactory {
	tlsConfig := &tls.Config{
		MinVersion:         tls.VersionTLS12,
		InsecureSkipVerify: insecureSkipVerify,
	}
	if rootCAs != nil {
		tlsConfig.RootCAs = rootCAs
	}

	return &RealClientFactory{
		config:             config,
		rootCAs:            rootCAs,
		insecureSkipVerify: insecureSkipVerify,
		logger:             logger,
		transport: &http.Transport{
			TLSClientConfig: tlsConfig,
			// Match Go's DefaultTransport pool settings.
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     90 * time.Second,
		},
	}
}

// CreateClient creates a new real BFF client for the specified target
func (f *RealClientFactory) CreateClient(target BFFTarget, authToken string) BFFClientInterface {
	return f.CreateClientWithHeaders(target, authToken, nil)
}

// CreateClientWithHeaders creates a new real BFF client with custom headers
func (f *RealClientFactory) CreateClientWithHeaders(target BFFTarget, authToken string, headers map[string]string) BFFClientInterface {
	serviceConfig := f.config.GetServiceConfig(target)
	if serviceConfig == nil {
		if f.logger != nil {
			f.logger.Warn("No configuration found for target BFF", "target", target)
		}
		return nil
	}

	baseURL := serviceConfig.GetURL(f.config.PodNamespace)
	if f.logger != nil {
		f.logger.Debug("Creating BFF client",
			"target", target,
			"baseURL", baseURL,
			"authMethod", serviceConfig.AuthMethod,
			"authTokenHeader", serviceConfig.AuthTokenHeader,
			"hasAuthToken", authToken != "",
			"hasHeaders", len(headers) > 0)
	}

	return NewHTTPBFFClientWithTransport(
		baseURL,
		target,
		authToken,
		headers,
		serviceConfig.AuthTokenHeader,
		serviceConfig.AuthTokenPrefix,
		f.transport,
	)
}

// GetConfig returns the configuration for a specific target
func (f *RealClientFactory) GetConfig(target BFFTarget) *BFFServiceConfig {
	return f.config.GetServiceConfig(target)
}

// IsTargetConfigured checks if a target BFF is configured
func (f *RealClientFactory) IsTargetConfigured(target BFFTarget) bool {
	return f.config.GetServiceConfig(target) != nil
}
