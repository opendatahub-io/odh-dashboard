package bffclient

import (
	"crypto/x509"
	"log/slog"
)

// BFFClientFactory creates BFF clients for inter-BFF communication.
type BFFClientFactory interface {
	CreateClient(target BFFTarget, authToken string) BFFClientInterface
	IsTargetConfigured(target BFFTarget) bool
}

// RealClientFactory creates real HTTP-based BFF clients.
type RealClientFactory struct {
	config             *BFFClientConfig
	rootCAs            *x509.CertPool
	insecureSkipVerify bool
	logger             *slog.Logger
}

func NewRealClientFactory(config *BFFClientConfig, rootCAs *x509.CertPool, insecureSkipVerify bool, logger *slog.Logger) BFFClientFactory {
	return &RealClientFactory{
		config:             config,
		rootCAs:            rootCAs,
		insecureSkipVerify: insecureSkipVerify,
		logger:             logger,
	}
}

func (f *RealClientFactory) CreateClient(target BFFTarget, authToken string) BFFClientInterface {
	serviceConfig := f.config.GetServiceConfig(target)
	if serviceConfig == nil {
		if f.logger != nil {
			f.logger.Warn("No configuration found for BFF target", "target", target)
		}
		return nil
	}

	baseURL := serviceConfig.GetURL(f.config.PodNamespace)

	return NewHTTPBFFClient(
		baseURL,
		target,
		authToken,
		nil,
		serviceConfig.AuthTokenHeader,
		serviceConfig.AuthTokenPrefix,
		serviceConfig.AllowedPaths,
		f.insecureSkipVerify,
		f.rootCAs,
	)
}

func (f *RealClientFactory) IsTargetConfigured(target BFFTarget) bool {
	return f.config.GetServiceConfig(target) != nil
}
