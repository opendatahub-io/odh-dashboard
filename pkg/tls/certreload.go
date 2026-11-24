package tls

import (
	"crypto/tls"
	"crypto/x509"
	"errors"
	"fmt"
	"io/fs"
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
// Failure policy: a rotation that cannot be loaded, or whose leaf is outside
// its validity window, is logged and the last-known-good certificate keeps
// being served. An unparseable or truncated file, a mismatched pair, or an
// expired or not-yet-valid leaf must never take the listener down and must
// never downgrade the transport. The next usable rotation is picked up
// automatically.
//
// Limits: a rotation is detected by file modification time, and a candidate is
// judged by parsing, key matching and the leaf validity window. A partial write
// that already holds a complete matching leaf but not yet its intermediates is
// indistinguishable from a leaf-only certificate and is promoted. Publishers
// should replace the pair atomically, as Kubernetes Secret volume updates do
// (symlink swap).
type CertReloader struct {
	certFile string
	keyFile  string
	logger   *slog.Logger

	mu          sync.RWMutex
	current     *tls.Certificate
	certModTime time.Time
	keyModTime  time.Time

	// The last rotation that failed to load. A failing pair is retried at most
	// every failedRetryInterval rather than on every handshake, and its
	// failure is logged once, so a persistent bad rotation (an expired or
	// not-yet-valid leaf, a deleted file) cannot flood the log or re-read and
	// re-parse the files on the hot path.
	failedCertMod time.Time
	failedKeyMod  time.Time
	failedAt      time.Time
	now           func() time.Time
}

// failedRetryInterval bounds how often a rotation that failed to load is
// retried while its files stay unchanged. A not-yet-valid leaf (issuer clock
// ahead of the node) becomes loadable without its files changing, so the
// retry cannot stop entirely.
const failedRetryInterval = 10 * time.Second

// NewCertReloader loads the pair eagerly and fails closed: a server must not
// start at all on a certificate it cannot load. Rotations after this point are
// fail-safe, not fail-closed.
func NewCertReloader(certFile, keyFile string, logger *slog.Logger) (*CertReloader, error) {
	r := &CertReloader{certFile: certFile, keyFile: keyFile, logger: logger, now: time.Now}

	// Record modification times before reading the pair, as GetCertificate
	// does. If a rotation lands between the stat and the load, the recorded
	// times are older than the loaded files and the next handshake reloads
	// harmlessly. The reverse order could pair the old certificate with the new
	// times and keep serving it until the following rotation.
	certMod, keyMod := modTime(certFile), modTime(keyFile)
	// The same usability check as a rotation: the files may have changed since
	// any earlier startup validation read them, so the pair the listener
	// actually serves is the one whose validity window is checked.
	cert, err := loadUsableKeyPair(certFile, keyFile, time.Now())
	if err != nil {
		// Neither path is echoed: a value that is not a path at all (a PEM
		// block pasted into a key-file setting) would otherwise reach the log.
		return nil, fmt.Errorf("failed to load the serving certificate and key: %w", withoutPath(err))
	}
	r.current = &cert
	r.certModTime, r.keyModTime = certMod, keyMod
	return r, nil
}

// GetCertificate satisfies tls.Config.GetCertificate. It reloads only when a
// file's modification time has moved, so the steady-state cost is two stat
// calls per handshake — negligible next to the handshake itself.
func (r *CertReloader) GetCertificate(*tls.ClientHelloInfo) (*tls.Certificate, error) {
	certMod, keyMod := modTime(r.certFile), modTime(r.keyFile)

	r.mu.RLock()
	unchanged := certMod.Equal(r.certModTime) && keyMod.Equal(r.keyModTime)
	backingOff := certMod.Equal(r.failedCertMod) && keyMod.Equal(r.failedKeyMod) &&
		r.now().Sub(r.failedAt) < failedRetryInterval
	current := r.current
	r.mu.RUnlock()

	if unchanged || backingOff {
		return current, nil
	}
	return r.reload(certMod, keyMod), nil
}

func (r *CertReloader) reload(certMod, keyMod time.Time) *tls.Certificate {
	cert, reloaded, loadErr, firstFailure := r.reloadLocked(certMod, keyMod)
	// Log after releasing the lock, so a slow log handler never holds up other
	// handshakes that only need the last-known-good certificate.
	switch {
	case loadErr != nil && !firstFailure:
		// Already reported for this pair; the retry is only for a leaf that
		// becomes valid without its files changing.
	case loadErr != nil:
		r.logger.Error("failed to load rotated serving certificate; keeping the previous one",
			"cert", r.certFile, "key", r.keyFile, "error", loadErr)
	case reloaded:
		r.logger.Info("reloaded rotated serving certificate", "cert", r.certFile, "key", r.keyFile)
	}
	return cert
}

// reloadLocked swaps in the rotated pair under the write lock and reports the
// outcome for the caller to log once the lock is released.
func (r *CertReloader) reloadLocked(certMod, keyMod time.Time) (current *tls.Certificate, reloaded bool, loadErr error, firstFailure bool) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Another handshake may have reloaded while this one waited for the lock.
	if certMod.Equal(r.certModTime) && keyMod.Equal(r.keyModTime) {
		return r.current, false, nil, false
	}
	samePair := certMod.Equal(r.failedCertMod) && keyMod.Equal(r.failedKeyMod)
	if samePair && r.now().Sub(r.failedAt) < failedRetryInterval {
		return r.current, false, nil, false
	}

	cert, err := loadUsableKeyPair(r.certFile, r.keyFile, r.now())
	if err != nil {
		// The new modification times are not recorded as current, so a
		// partially written rotation is still picked up once its second file
		// lands (that changes a modification time and ends the back-off).
		r.failedCertMod, r.failedKeyMod, r.failedAt = certMod, keyMod, r.now()
		return r.current, false, err, !samePair
	}

	r.current = &cert
	r.certModTime, r.keyModTime = certMod, keyMod
	r.failedCertMod, r.failedKeyMod, r.failedAt = time.Time{}, time.Time{}, time.Time{}
	return r.current, true, nil, false
}

// withoutPath drops the file path os.PathError would quote, keeping the
// operation and the reason.
func withoutPath(err error) error {
	var pathErr *fs.PathError
	if errors.As(err, &pathErr) {
		return fmt.Errorf("%s: %w", pathErr.Op, pathErr.Err)
	}
	return err
}

// loadUsableKeyPair loads a pair, at startup or on rotation, and rejects a
// leaf outside its validity window at now. A pair that parses and matches is not necessarily a
// usable replacement: promoting an expired or not-yet-valid certificate would
// displace a working one and make verifying clients reject new connections.
// Trust is not checked; a private or service CA is legitimate.
func loadUsableKeyPair(certFile, keyFile string, now time.Time) (tls.Certificate, error) {
	cert, err := tls.LoadX509KeyPair(certFile, keyFile)
	if err != nil {
		return tls.Certificate{}, err
	}
	leaf := cert.Leaf
	if leaf == nil {
		if leaf, err = x509.ParseCertificate(cert.Certificate[0]); err != nil {
			return tls.Certificate{}, fmt.Errorf("parse leaf certificate: %w", err)
		}
	}
	switch {
	case now.Before(leaf.NotBefore):
		return tls.Certificate{}, fmt.Errorf("certificate is not valid until %s", leaf.NotBefore.UTC().Format(time.RFC3339))
	case now.After(leaf.NotAfter):
		return tls.Certificate{}, fmt.Errorf("certificate expired at %s", leaf.NotAfter.UTC().Format(time.RFC3339))
	}
	return cert, nil
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
