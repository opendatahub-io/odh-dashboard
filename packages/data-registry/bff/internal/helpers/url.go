package helper

import (
	"fmt"
	"net"
	"net/url"
)

// ValidateUpstreamURL parses raw as an absolute HTTPS URL with a host and no userinfo, query, or
// fragment. Plain HTTP is accepted only for loopback IP literals for local development and tests.
// This prevents forwarding the caller's bearer token to a remote upstream over an unencrypted
// connection. The function is used wherever an upstream base URL comes from external
// configuration (a ConfigMap value or a CLI/env override), so malformed, incomplete, or unsafe
// values fail at the configuration boundary rather than producing an unusable proxy target or a
// silently wrong one (see reverse_proxy.go, which appends the request path to whatever this
// returns).
func ValidateUpstreamURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid upstream URL %q: %w", raw, err)
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return nil, fmt.Errorf("invalid upstream URL %q: scheme must be https (or http for a loopback IP literal)", raw)
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
	if u.Scheme == "http" && !isLoopbackIP(u.Hostname()) {
		return nil, fmt.Errorf("invalid upstream URL: plaintext HTTP is only allowed for loopback IP literals; use HTTPS for remote upstreams")
	}
	return u, nil
}

func isLoopbackIP(host string) bool {
	ip := net.ParseIP(host)
	return ip != nil && ip.IsLoopback()
}
