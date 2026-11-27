package httpcontract

import (
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strings"
)

// maxRedirects matches net/http's own default limit.
const maxRedirects = 10

// ErrCrossOriginRedirect reports a redirect refused by SameOriginRedirects.
var ErrCrossOriginRedirect = errors.New("refusing a redirect that changes the scheme, host or port")

// SameOriginRedirects is an http.Client CheckRedirect policy for clients that
// carry the caller's credential. It refuses, before the request is sent, any
// redirect that changes the scheme, hostname or effective port. DNS names
// compare case-insensitively, and the scheme check is exact because net/url
// lower-cases it on parse. net/http keeps
// Authorization on a same-hostname redirect whatever the scheme or port, and
// forwards custom headers such as x-forwarded-access-token to any host, so a
// redirect could otherwise put the token in plaintext or in another service.
func SameOriginRedirects(req *http.Request, via []*http.Request) error {
	if len(via) >= maxRedirects {
		return fmt.Errorf("stopped after %d redirects", maxRedirects)
	}
	original := via[0].URL
	if req.URL.Scheme != original.Scheme ||
		!strings.EqualFold(req.URL.Hostname(), original.Hostname()) ||
		effectivePort(req.URL) != effectivePort(original) {
		return ErrCrossOriginRedirect
	}
	return nil
}

// effectivePort is the URL's port, or the scheme's default when it has none.
func effectivePort(u *url.URL) string {
	if p := u.Port(); p != "" {
		return p
	}
	if u.Scheme == "http" {
		return "80"
	}
	return "443"
}
