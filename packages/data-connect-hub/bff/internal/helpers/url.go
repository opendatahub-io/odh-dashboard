package helper

import (
	"fmt"
	"net/url"
	"strings"
)

func ValidateHTTPSUpstreamURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid upstream URL: %w", err)
	}
	if parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return fmt.Errorf("invalid upstream URL %q: expected an HTTPS URL without credentials, query, or fragment", raw)
	}
	return nil
}

func NormalizeHTTPSUpstreamURL(raw string) (string, error) {
	if err := ValidateHTTPSUpstreamURL(raw); err != nil {
		return "", err
	}
	return strings.TrimRight(raw, "/"), nil
}
