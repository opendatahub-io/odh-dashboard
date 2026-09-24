package helper

import (
	"errors"
	"net/url"
	"strings"
)

func ValidateHTTPSUpstreamURL(raw string) error {
	parsed, err := url.Parse(raw)
	if err != nil {
		return errors.New("invalid upstream URL")
	}
	if parsed.Scheme != "https" || parsed.Host == "" || parsed.User != nil || parsed.RawQuery != "" || parsed.Fragment != "" {
		return errors.New("invalid upstream URL: expected HTTPS without credentials, query, or fragment")
	}
	return nil
}

func NormalizeHTTPSUpstreamURL(raw string) (string, error) {
	if err := ValidateHTTPSUpstreamURL(raw); err != nil {
		return "", err
	}
	return strings.TrimRight(raw, "/"), nil
}
