package e2e

import (
	"fmt"
	"net/url"
	"strings"

	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
)

type fixtureMode string

const (
	fixtureModeExisting fixtureMode = "existing"
	fixtureModeManaged  fixtureMode = "managed"
)

func parseFixtureMode(value string) (fixtureMode, error) {
	mode := fixtureMode(strings.ToLower(strings.TrimSpace(value)))
	switch mode {
	case fixtureModeExisting, fixtureModeManaged:
		return mode, nil
	default:
		return "", fmt.Errorf("fixture mode must be %q or %q, got %q", fixtureModeExisting, fixtureModeManaged, value)
	}
}

func resolveTestNamespace(testNamespace, applicationsNamespace string) (string, error) {
	namespace := strings.TrimSpace(testNamespace)
	source := "TEST_NAMESPACE"
	if namespace == "" {
		namespace = strings.TrimSpace(applicationsNamespace)
		source = "E2E_TEST_APPLICATIONS_NAMESPACE"
	}
	if namespace == "" {
		return "", fmt.Errorf("TEST_NAMESPACE or E2E_TEST_APPLICATIONS_NAMESPACE must name an existing namespace")
	}
	if problems := k8svalidation.IsDNS1123Label(namespace); len(problems) > 0 {
		return "", fmt.Errorf("%s %q is invalid: %v", source, namespace, problems)
	}
	return namespace, nil
}

func resolveGatewayDomain(explicitDomain, dashboardURL string) (string, error) {
	domain := strings.TrimSpace(explicitDomain)
	source := "TEST_GATEWAY_DOMAIN"
	if domain == "" {
		source = "Dashboard status.url"
		if strings.TrimSpace(dashboardURL) == "" {
			return "", fmt.Errorf("TEST_GATEWAY_DOMAIN is unset and Dashboard status.url is empty")
		}
		parsed, err := url.Parse(dashboardURL)
		if err != nil {
			return "", fmt.Errorf("parse Dashboard status.url %q: %w", dashboardURL, err)
		}
		if parsed.Scheme != "https" || parsed.Hostname() == "" {
			return "", fmt.Errorf("dashboard status.url %q must be an HTTPS URL with a hostname", dashboardURL)
		}
		domain = parsed.Hostname()
	}
	if problems := k8svalidation.IsDNS1123Subdomain(domain); len(problems) > 0 {
		return "", fmt.Errorf("%s %q is invalid: %v", source, domain, problems)
	}
	return domain, nil
}

func resolveManagedGatewayDomain(explicitDomain string) (string, error) {
	if strings.TrimSpace(explicitDomain) == "" {
		return "", fmt.Errorf("managed fixture mode requires TEST_GATEWAY_DOMAIN before the Dashboard CR is created")
	}
	return resolveGatewayDomain(explicitDomain, "")
}

func resolvePlatform(explicitPlatform string, hasODHService, hasRHOAIService bool) (string, error) {
	platform := strings.ToLower(strings.TrimSpace(explicitPlatform))
	if platform != "" {
		if platform != "odh" && platform != "rhoai" {
			return "", fmt.Errorf("TEST_PLATFORM must be odh or rhoai, got %q", explicitPlatform)
		}
		return platform, nil
	}

	switch {
	case hasODHService && !hasRHOAIService:
		return "odh", nil
	case hasRHOAIService && !hasODHService:
		return "rhoai", nil
	case hasODHService && hasRHOAIService:
		return "", fmt.Errorf("cannot infer platform: both odh-dashboard and rhods-dashboard Services exist")
	default:
		return "", fmt.Errorf("cannot infer platform: neither odh-dashboard nor rhods-dashboard Service exists")
	}
}
