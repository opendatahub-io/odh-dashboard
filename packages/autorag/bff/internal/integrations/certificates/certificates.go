package certificates

import (
	"crypto/x509"
	"fmt"
)

// SystemCertPoolWithPEM returns the system trust store extended with certificatePEM.
// fieldName identifies the secret key in a configuration error.
func SystemCertPoolWithPEM(certificatePEM []byte, fieldName string) (*x509.CertPool, error) {
	pool, err := x509.SystemCertPool()
	if err != nil || pool == nil {
		pool = x509.NewCertPool()
	}
	if !pool.AppendCertsFromPEM(certificatePEM) {
		return nil, fmt.Errorf("failed to parse %s", fieldName)
	}
	return pool, nil
}
