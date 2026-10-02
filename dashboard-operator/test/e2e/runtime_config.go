package e2e

import (
	"context"
	"fmt"
	"net/url"
	"strings"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	k8svalidation "k8s.io/apimachinery/pkg/util/validation"
	"sigs.k8s.io/controller-runtime/pkg/client"
)

type fixtureMode string

const (
	fixtureModeExisting fixtureMode = "existing"
	fixtureModeManaged  fixtureMode = "managed"
	platformODH                     = "odh"
	platformRHOAI                   = "rhoai"
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
	explicitNamespace := strings.TrimSpace(testNamespace)
	shiftLeftNamespace := strings.TrimSpace(applicationsNamespace)
	if explicitNamespace != "" && shiftLeftNamespace != "" && explicitNamespace != shiftLeftNamespace {
		return "", fmt.Errorf(
			"TEST_NAMESPACE %q conflicts with E2E_TEST_APPLICATIONS_NAMESPACE %q; set only one or use the same value",
			explicitNamespace,
			shiftLeftNamespace,
		)
	}

	namespace := explicitNamespace
	source := "TEST_NAMESPACE"
	if namespace == "" {
		namespace = shiftLeftNamespace
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
			return "", fmt.Errorf("parse Dashboard status.url: %w", err)
		}
		if parsed.Scheme != "https" || parsed.Hostname() == "" {
			return "", fmt.Errorf("dashboard status.url must be an HTTPS URL with a hostname")
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
		if platform != platformODH && platform != platformRHOAI {
			return "", fmt.Errorf("TEST_PLATFORM must be odh or rhoai, got %q", explicitPlatform)
		}
		return platform, nil
	}

	switch {
	case hasODHService && !hasRHOAIService:
		return platformODH, nil
	case hasRHOAIService && !hasODHService:
		return platformRHOAI, nil
	case hasODHService && hasRHOAIService:
		return "", fmt.Errorf("cannot infer platform: both odh-dashboard and rhods-dashboard Services exist")
	default:
		return "", fmt.Errorf("cannot infer platform: neither odh-dashboard nor rhods-dashboard Service exists; set TEST_PLATFORM to override discovery")
	}
}

func validateInstalledDashboard(dashboard *dashboardv1alpha1.Dashboard) error {
	if dashboard.UID == "" {
		return fmt.Errorf("installed Dashboard %q has no UID", dashboard.Name)
	}
	if dashboard.Spec.ManagementState != common.Managed {
		return fmt.Errorf(
			"installed Dashboard %q must have managementState %q, got %q",
			dashboard.Name,
			common.Managed,
			dashboard.Spec.ManagementState,
		)
	}
	return nil
}

func discoverPlatform(ctx context.Context, c client.Client, namespace, explicit string) (string, error) {
	if strings.TrimSpace(explicit) != "" {
		return resolvePlatform(explicit, false, false)
	}
	hasODHService, err := serviceExists(ctx, c, namespace, "odh-dashboard")
	if err != nil {
		return "", err
	}
	hasRHOAIService, err := serviceExists(ctx, c, namespace, "rhods-dashboard")
	if err != nil {
		return "", err
	}
	return resolvePlatform("", hasODHService, hasRHOAIService)
}

func serviceExists(ctx context.Context, c client.Client, namespace, name string) (bool, error) {
	service := &corev1.Service{}
	err := c.Get(ctx, client.ObjectKey{Namespace: namespace, Name: name}, service)
	switch {
	case err == nil:
		return true, nil
	case apierrors.IsNotFound(err):
		return false, nil
	default:
		return false, fmt.Errorf("discover platform from Service %s/%s: %w", namespace, name, err)
	}
}
