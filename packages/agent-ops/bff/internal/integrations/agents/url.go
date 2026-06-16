package agents

import (
	"net/url"
	"strings"
)

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
