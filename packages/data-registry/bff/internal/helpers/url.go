package helper

import (
	"fmt"
	"net/url"
)

// ValidateUpstreamURL parses raw as an absolute http(s) URL with a host and no userinfo, query,
// or fragment. It is used wherever an upstream base URL comes from external configuration (a
// ConfigMap value or a CLI/env override), so a malformed, incomplete, or unsafe value fails fast
// with a clear error at the configuration boundary rather than producing an unusable proxy
// target or a silently wrong one (see reverse_proxy.go, which appends the request path to
// whatever this returns).
//
// This intentionally does not require https: the deployment contract for the upstream Data
// Registry API (RHAISTRAT-2381) does not yet guarantee TLS is available on every target, so
// rejecting http here would risk breaking a legitimate configuration. Enforcing https (with an
// http allowance for local dev/test loopback targets) is still an open, tracked follow-up — see
// RHAI-415 review discussion — once that contract is confirmed.
func ValidateUpstreamURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid upstream URL %q: %w", raw, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("invalid upstream URL %q: scheme must be http or https", raw)
	}
	if u.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q: must be an absolute URL with a host", raw)
	}
	// Userinfo in a configured base URL is always a misconfiguration here: the proxy never
	// derives credentials from the target URL, it rebuilds "Authorization" from the caller's own
	// verified identity (see reverse_proxy.go). Rejecting it up front avoids silently storing
	// (and never using) embedded credentials.
	if u.User != nil {
		return nil, fmt.Errorf("invalid upstream URL %q: userinfo (credentials in the URL) is not allowed", raw)
	}
	// A base URL carrying a query string or fragment is ambiguous once request-specific paths
	// and queries are appended in reverse_proxy.go, so reject it rather than guess intent.
	if u.RawQuery != "" || u.Fragment != "" {
		return nil, fmt.Errorf("invalid upstream URL %q: query string and fragment are not allowed in a base URL", raw)
	}
	return u, nil
}
