package proxy

import (
	"crypto/tls"
	"crypto/x509"
)

func NewTLSConfig(rootCAs *x509.CertPool, insecureSkipVerify bool) *tls.Config {
	return &tls.Config{
		MinVersion:         tls.VersionTLS12,
		RootCAs:            rootCAs,
		InsecureSkipVerify: insecureSkipVerify, //nolint:gosec // G402: controlled by CLI flag, dev-only
	}
}
