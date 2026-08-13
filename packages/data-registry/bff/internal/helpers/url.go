package helper

import (
	"fmt"
	"net/url"
)

// ValidateUpstreamURL parses raw as an absolute URL with a non-empty scheme and host. It is used
// wherever an upstream base URL comes from external configuration (a ConfigMap value or a
// CLI/env override), so a malformed or empty value fails fast with a clear error at the
// configuration boundary instead of silently producing an unusable (or unsafe) proxy target.
func ValidateUpstreamURL(raw string) (*url.URL, error) {
	u, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid upstream URL %q: %w", raw, err)
	}
	if u.Scheme == "" || u.Host == "" {
		return nil, fmt.Errorf("invalid upstream URL %q: must be an absolute URL with a scheme and host", raw)
	}
	return u, nil
}
