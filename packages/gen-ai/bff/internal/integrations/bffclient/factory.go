package bffclient

import (
	"crypto/x509"
	"log/slog"
)

// BFFClientFactory interface for creating BFF clients
type BFFClientFactory interface {
	// CreateClient creates a client for the specified target BFF
	CreateClient(target BFFTarget, authToken string) BFFClientInterface

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
}

// NewRealClientFactory creates a factory for real BFF clients
func NewRealClientFactory(config *BFFClientConfig, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) BFFClientFactory {
	return &RealClientFactory{
		config:             config,
		rootCAs:            rootCAs,
		insecureSkipVerify: insecureSkipVerify,
		logger:             logger,
	}
}

// CreateClient creates a new real BFF client for the specified target
func (f *RealClientFactory) CreateClient(target BFFTarget, authToken string) BFFClientInterface {
	serviceConfig := f.config.GetServiceConfig(target)
	if serviceConfig == nil {
		f.logger.Warn("No configuration found for target BFF", "target", target)
		return nil
	}

	baseURL := serviceConfig.GetURL(f.config.PodNamespace)
	f.logger.Debug("Creating BFF client",
		"target", target,
		"baseURL", baseURL,
		"hasAuthToken", authToken != "")

	return NewHTTPBFFClient(baseURL, target, authToken, f.insecureSkipVerify, f.rootCAs)
}

// GetConfig returns the configuration for a specific target
func (f *RealClientFactory) GetConfig(target BFFTarget) *BFFServiceConfig {
	return f.config.GetServiceConfig(target)
}

// IsTargetConfigured checks if a target BFF is configured
func (f *RealClientFactory) IsTargetConfigured(target BFFTarget) bool {
	return f.config.GetServiceConfig(target) != nil
}
