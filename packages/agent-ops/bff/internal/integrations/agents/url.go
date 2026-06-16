package agents

import (
	"net/url"
	pathpkg "path"
	"strings"
)

// BuildSanitizedHTTPURL assembles an http/https URL with a normalized path.
func BuildSanitizedHTTPURL(scheme, host, rawPath string) string {
	scheme = strings.TrimSpace(scheme)
	host = strings.TrimSpace(host)
	rawPath = strings.TrimSpace(rawPath)
	if host == "" {
		return ""
	}
	if strings.Contains(rawPath, "..") {
		return ""
	}

	normalizedPath := rawPath
	if normalizedPath == "" {
		normalizedPath = "/"
	} else if !strings.HasPrefix(normalizedPath, "/") {
		normalizedPath = "/" + normalizedPath
	}
	normalizedPath = pathpkg.Clean(normalizedPath)
	if normalizedPath == "." {
		normalizedPath = "/"
	}

	parsed := &url.URL{
		Scheme: scheme,
		Host:   host,
		Path:   normalizedPath,
	}
	return SanitizeHTTPURL(parsed.String())
}

// SanitizeHTTPURL returns the URL only when it uses an http or https scheme.
func SanitizeHTTPURL(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return ""
	}

	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		if parsed.User != nil {
			return ""
		}
		return raw
	default:
		return ""
	}
}

// SanitizeResourceURI returns safe http/https agent-card URLs and urn extension identifiers.
func SanitizeResourceURI(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Scheme == "" {
		return ""
	}
	if parsed.User != nil {
		return ""
	}

	switch strings.ToLower(parsed.Scheme) {
	case "http", "https":
		if parsed.Host == "" {
			return ""
		}
		return raw
	case "urn":
		return raw
	default:
		return ""
	}
}
