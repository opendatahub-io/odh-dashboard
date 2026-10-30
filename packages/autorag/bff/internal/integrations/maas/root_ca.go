package maas

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"sync/atomic"
)

// DynamicRootCAPool keeps an immutable base pool and publishes a replacement
// pool whenever the installation router CA changes. Readers can safely use the
// returned pool concurrently because a published pool is never mutated.
type DynamicRootCAPool struct {
	base    *x509.CertPool
	current atomic.Pointer[x509.CertPool]
}

func NewDynamicRootCAPool(base *x509.CertPool) *DynamicRootCAPool {
	base = cloneOrSystemRootCAPool(base)
	pool := &DynamicRootCAPool{base: base}
	pool.current.Store(base)
	return pool
}

func (p *DynamicRootCAPool) Current() *x509.CertPool {
	return p.current.Load()
}

// Update replaces the published router CA while retaining only the immutable
// base bundle and the current certificate. This prevents stale rotated CAs
// from accumulating in the trust pool.
func (p *DynamicRootCAPool) Update(certificate []byte) error {
	if len(certificate) == 0 {
		return fmt.Errorf("CA certificate is empty")
	}
	next := p.base.Clone()
	if !next.AppendCertsFromPEM(certificate) {
		return fmt.Errorf("failed to parse router CA certificate")
	}
	p.current.Store(next)
	return nil
}

func cloneOrSystemRootCAPool(rootCAs *x509.CertPool) *x509.CertPool {
	if rootCAs != nil {
		return rootCAs.Clone()
	}
	if systemPool, err := x509.SystemCertPool(); err == nil && systemPool != nil {
		return systemPool
	}
	return x509.NewCertPool()
}

func dynamicTLSDialContext(
	baseDialContext func(context.Context, string, string) (net.Conn, error),
	baseTLSConfig *tls.Config,
	rootCAPool func() *x509.CertPool,
) func(context.Context, string, string) (net.Conn, error) {
	return func(ctx context.Context, network, addr string) (net.Conn, error) {
		rawConn, err := baseDialContext(ctx, network, addr)
		if err != nil {
			return nil, err
		}

		host, _, err := net.SplitHostPort(addr)
		if err != nil {
			_ = rawConn.Close()
			return nil, fmt.Errorf("invalid TLS address %q: %w", addr, err)
		}

		tlsConfig := baseTLSConfig.Clone()
		if currentPool := rootCAPool(); currentPool != nil {
			tlsConfig.RootCAs = currentPool
		}
		if tlsConfig.ServerName == "" {
			tlsConfig.ServerName = host
		}
		tlsConn := tls.Client(rawConn, tlsConfig)
		if err := tlsConn.HandshakeContext(ctx); err != nil {
			_ = rawConn.Close()
			return nil, err
		}
		return tlsConn, nil
	}
}
