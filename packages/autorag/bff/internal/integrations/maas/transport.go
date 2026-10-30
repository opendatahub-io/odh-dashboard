package maas

import (
	"net/http"
	"sync"
)

// originPartitionedTransport keeps ordinary requests separate from each
// request-scoped trusted origin. This preserves keep-alive reuse within the
// same authorization boundary without allowing an ordinary request to reuse a
// connection opened for a private MaaS origin.
type originPartitionedTransport struct {
	public          http.RoundTripper
	newTrusted      func() http.RoundTripper
	trustedMu       sync.Mutex
	trustedByOrigin map[MaaSOrigin]http.RoundTripper
}

func newOriginPartitionedTransport(newTransport func() http.RoundTripper) *originPartitionedTransport {
	return &originPartitionedTransport{
		public:          newTransport(),
		newTrusted:      newTransport,
		trustedByOrigin: make(map[MaaSOrigin]http.RoundTripper),
	}
}

func (t *originPartitionedTransport) RoundTrip(req *http.Request) (*http.Response, error) {
	trustedOrigin, trusted := trustedMaaSOriginFromContext(req.Context())
	if !trusted {
		return t.public.RoundTrip(req)
	}

	t.trustedMu.Lock()
	transport, found := t.trustedByOrigin[trustedOrigin]
	var obsolete []http.RoundTripper
	if !found {
		// The resolver represents one installation-level origin. Keep only the
		// current pool so rotated origins cannot accumulate idle transports.
		for origin, existing := range t.trustedByOrigin {
			delete(t.trustedByOrigin, origin)
			obsolete = append(obsolete, existing)
		}
		transport = t.newTrusted()
		t.trustedByOrigin[trustedOrigin] = transport
	}
	t.trustedMu.Unlock()
	for _, existing := range obsolete {
		closeIdleConnections(existing)
	}
	return transport.RoundTrip(req)
}

func (t *originPartitionedTransport) CloseIdleConnections() {
	closeIdleConnections(t.public)

	t.trustedMu.Lock()
	trustedTransports := make([]http.RoundTripper, 0, len(t.trustedByOrigin))
	for _, transport := range t.trustedByOrigin {
		trustedTransports = append(trustedTransports, transport)
	}
	t.trustedMu.Unlock()

	for _, transport := range trustedTransports {
		closeIdleConnections(transport)
	}
}

func closeIdleConnections(transport http.RoundTripper) {
	if closer, ok := transport.(interface{ CloseIdleConnections() }); ok {
		closer.CloseIdleConnections()
	}
}
