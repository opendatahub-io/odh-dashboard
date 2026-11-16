package tls

import (
	"crypto/tls"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"time"
)

// CertReloader serves the current contents of a certificate/key pair on every
// TLS handshake, so a rotated certificate is picked up without a pod restart.
//
// This matters because the files are usually a mounted Kubernetes Secret.
// cert-manager and the OpenShift service CA rotate that Secret in place and do
// not roll the pod, so a listener that read the pair once at startup keeps
// presenting the old certificate until it expires. The profile reload loop in
// reload.go only restarts the listener when the cluster TLS *profile* changes,
// which is a different and much rarer event.
//
// Failure policy: a rotation that cannot be loaded is logged and the
// last-known-good certificate keeps being served. A bad write, a partially
// written file, or a mismatched pair must never take the listener down and must
// never downgrade the transport. The next readable rotation is picked up
// automatically.
type CertReloader struct {
	certFile string
	keyFile  string
	logger   *slog.Logger

	mu          sync.RWMutex
	current     *tls.Certificate
	certModTime time.Time
	keyModTime  time.Time
}

// NewCertReloader loads the pair eagerly and fails closed: a server must not
// start at all on a certificate it cannot load. Rotations after this point are
// fail-safe, not fail-closed.
func NewCertReloader(certFile, keyFile string, logger *slog.Logger) (*CertReloader, error) {
	r := &CertReloader{certFile: certFile, keyFile: keyFile, logger: logger}

	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return nil, fmt.Errorf("failed to load serving certificate (cert=%s key=%s): %w", certFile, keyFile, err)
	}
	r.current = &cert
	r.certModTime, r.keyModTime = modTime(certFile), modTime(keyFile)
	return r, nil
}

// GetCertificate satisfies tls.Config.GetCertificate. It reloads only when a
// file's modification time has moved, so the steady-state cost is two stat
// calls per handshake — negligible next to the handshake itself.
func (r *CertReloader) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {
	certMod, keyMod := modTime(r.certFile), modTime(r.keyFile)

	r.mu.RLock()
	unchanged := certMod.Equal(r.certModTime) && keyMod.Equal(r.keyModTime)
	current := r.current
	r.mu.RUnlock()

	if unchanged {
		return current, nil
	}
	return r.reload(certMod, keyMod), nil
}

func (r *CertReloader) reload(certMod, keyMod time.Time) *tls.Certificate {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Another handshake may have reloaded while this one waited for the lock.
	if certMod.Equal(r.certModTime) && keyMod.Equal(r.keyModTime) {
		return r.current
	}

	cert, err := tls.LoadX509KeyPair(r.certFile, r.keyFile)
	if err != nil {
		// Do not record the new modification times: the next handshake retries,
		// which is what picks up a partially written rotation a moment later.
		r.logger.Error("failed to load rotated serving certificate; keeping the previous one",
			"cert", r.certFile, "key", r.keyFile, "error", err)
		return r.current
	}

	r.current = &cert
	r.certModTime, r.keyModTime = certMod, keyMod
	r.logger.Info("reloaded rotated serving certificate", "cert", r.certFile, "key", r.keyFile)
	return r.current
}

// modTime returns the zero time for an unreadable path, which compares unequal
// to any recorded time and therefore triggers a reload attempt.
func modTime(path string) time.Time {
	info, err := os.Stat(path)
	if err != nil {
		return time.Time{}
	}
	return info.ModTime()
}
