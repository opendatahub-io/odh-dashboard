package e2e

import (
	"errors"
	"fmt"
	"strings"

	dashboardv1alpha1 "github.com/opendatahub-io/odh-dashboard/dashboard-operator/api/v1alpha1"
	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/util/version"
)

const (
	dashboardCELRule              = "self.metadata.name == 'default-dashboard'"
	dashboardCELValidationMessage = "Dashboard name must be default-dashboard"
	dashboardWebhookDenialMessage = "only one instance of Dashboard is allowed; an instance already exists"
	dashboardWebhookResource      = "dashboards"
	dashboardRepositoryURL        = "https://github.com/opendatahub-io/odh-dashboard"
)

type dashboardWebhookTarget struct {
	configurationName string
	webhookName       string
	serviceNamespace  string
	serviceName       string
	servicePath       string
	servicePort       int32
}

func selectDashboardWebhook(
	configurations []admissionregistrationv1.ValidatingWebhookConfiguration,
) (dashboardWebhookTarget, error) {
	var targets []dashboardWebhookTarget

	for i := range configurations {
		configuration := &configurations[i]
		for j := range configuration.Webhooks {
			webhook := &configuration.Webhooks[j]
			if !webhookHandlesDashboardCreates(webhook) {
				continue
			}

			if webhook.FailurePolicy == nil || *webhook.FailurePolicy != admissionregistrationv1.Fail {
				return dashboardWebhookTarget{}, fmt.Errorf(
					"dashboard validating webhook %s/%s must use failurePolicy Fail",
					configuration.Name,
					webhook.Name,
				)
			}
			if len(webhook.ClientConfig.CABundle) == 0 {
				return dashboardWebhookTarget{}, fmt.Errorf(
					"dashboard validating webhook %s/%s has no CA bundle",
					configuration.Name,
					webhook.Name,
				)
			}
			if !containsString(webhook.AdmissionReviewVersions, "v1") {
				return dashboardWebhookTarget{}, fmt.Errorf(
					"dashboard validating webhook %s/%s does not support admissionReviewVersion v1",
					configuration.Name,
					webhook.Name,
				)
			}

			service := webhook.ClientConfig.Service
			if service == nil || service.Namespace == "" || service.Name == "" || service.Path == nil || *service.Path == "" {
				return dashboardWebhookTarget{}, fmt.Errorf(
					"dashboard validating webhook %s/%s must use a Service with namespace, name, and path",
					configuration.Name,
					webhook.Name,
				)
			}

			port := int32(443)
			if service.Port != nil {
				port = *service.Port
			}
			targets = append(targets, dashboardWebhookTarget{
				configurationName: configuration.Name,
				webhookName:       webhook.Name,
				serviceNamespace:  service.Namespace,
				serviceName:       service.Name,
				servicePath:       *service.Path,
				servicePort:       port,
			})
		}
	}

	switch len(targets) {
	case 0:
		return dashboardWebhookTarget{}, errors.New("no validating webhook handles Dashboard CREATE requests")
	case 1:
		return targets[0], nil
	default:
		return dashboardWebhookTarget{}, fmt.Errorf(
			"found %d validating webhooks that handle Dashboard CREATE requests; expected exactly one",
			len(targets),
		)
	}
}

func webhookHandlesDashboardCreates(webhook *admissionregistrationv1.ValidatingWebhook) bool {
	for _, rule := range webhook.Rules {
		if ruleHandlesClusterScopedResources(rule.Scope) &&
			containsOperation(rule.Operations, admissionregistrationv1.Create) &&
			containsString(rule.APIGroups, dashboardv1alpha1.GroupVersion.Group) &&
			containsString(rule.APIVersions, dashboardv1alpha1.GroupVersion.Version) &&
			containsString(rule.Resources, dashboardWebhookResource) {
			return true
		}
	}

	return false
}

func ruleHandlesClusterScopedResources(scope *admissionregistrationv1.ScopeType) bool {
	return scope == nil ||
		*scope == admissionregistrationv1.ClusterScope ||
		*scope == admissionregistrationv1.AllScopes
}

func containsOperation(operations []admissionregistrationv1.OperationType, expected admissionregistrationv1.OperationType) bool {
	for _, operation := range operations {
		if operation == expected || operation == admissionregistrationv1.OperationAll {
			return true
		}
	}

	return false
}

func containsString(values []string, expected string) bool {
	for _, value := range values {
		if value == expected {
			return true
		}
	}

	return false
}

func equivalentCELRule(actual, expected string) bool {
	return stripCELFormattingWhitespace(actual) == stripCELFormattingWhitespace(expected)
}

func stripCELFormattingWhitespace(rule string) string {
	var normalized strings.Builder
	normalized.Grow(len(rule))

	var quote rune
	escaped := false
	for _, character := range rule {
		if quote != 0 {
			normalized.WriteRune(character)
			if escaped {
				escaped = false
			} else if character == '\\' {
				escaped = true
			} else if character == quote {
				quote = 0
			}
			continue
		}

		if character == '\'' || character == '"' {
			quote = character
			normalized.WriteRune(character)
		} else if !strings.ContainsRune(" \t\r\n", character) {
			normalized.WriteRune(character)
		}
	}

	return normalized.String()
}

func validateCELRejection(err error) error {
	if err == nil {
		return errors.New("CEL singleton probe was unexpectedly accepted")
	}
	if !apierrors.IsInvalid(err) {
		return fmt.Errorf("CEL singleton probe must be Invalid, got: %w", err)
	}
	if !strings.Contains(err.Error(), dashboardCELValidationMessage) {
		return fmt.Errorf("CEL singleton rejection does not contain %q: %w", dashboardCELValidationMessage, err)
	}

	return nil
}

func validateWebhookRejection(err error) error {
	if err == nil {
		return errors.New("validating webhook singleton probe was unexpectedly accepted")
	}
	if apierrors.IsAlreadyExists(err) {
		return fmt.Errorf("duplicate reached storage and returned AlreadyExists instead of a webhook denial: %w", err)
	}
	if !apierrors.IsForbidden(err) {
		return fmt.Errorf("validating webhook singleton probe must be Forbidden, got: %w", err)
	}
	if !strings.Contains(err.Error(), "admission webhook") ||
		!strings.Contains(err.Error(), dashboardWebhookDenialMessage) {
		return fmt.Errorf("forbidden response does not prove the Dashboard singleton webhook denied the request: %w", err)
	}

	return nil
}

func validateRequiredReleases(releases []common.ComponentRelease) error {
	seen := make(map[string]struct{}, len(releases))
	for _, release := range releases {
		if _, duplicate := seen[release.Name]; duplicate {
			return fmt.Errorf("status.releases contains duplicate %q entries", release.Name)
		}
		seen[release.Name] = struct{}{}
	}

	required := map[string]string{
		dashboardv1alpha1.DashboardComponentName: dashboardRepositoryURL,
		common.ReleasePlatform:                   "",
	}

	for name, expectedRepositoryURL := range required {
		matches := make([]common.ComponentRelease, 0, 1)
		for _, release := range releases {
			if release.Name == name {
				matches = append(matches, release)
			}
		}

		if len(matches) != 1 {
			return fmt.Errorf("status.releases must contain exactly one %q entry, found %d", name, len(matches))
		}

		release := matches[0]
		if _, err := version.ParseSemantic(release.Version); err != nil {
			return fmt.Errorf("status.releases[%s].version %q is not semantic: %w", name, release.Version, err)
		}
		if expectedRepositoryURL != "" && release.RepoURL != expectedRepositoryURL {
			return fmt.Errorf(
				"status.releases[%s].repoUrl is %q; expected %q",
				name,
				release.RepoURL,
				expectedRepositoryURL,
			)
		}
	}

	return nil
}
