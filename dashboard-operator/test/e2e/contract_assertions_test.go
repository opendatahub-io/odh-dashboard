package e2e

import (
	"errors"
	"testing"

	"github.com/opendatahub-io/odh-platform-utilities/api/common"
	"github.com/stretchr/testify/require"
	admissionregistrationv1 "k8s.io/api/admissionregistration/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestSelectDashboardWebhook(t *testing.T) {
	failurePolicy := admissionregistrationv1.Fail
	path := "/validate-dashboard"
	port := int32(443)
	valid := admissionregistrationv1.ValidatingWebhookConfiguration{
		ObjectMeta: metav1.ObjectMeta{Name: "dashboard-validating"},
		Webhooks: []admissionregistrationv1.ValidatingWebhook{{
			Name:                    "validate.dashboard.platform.opendatahub.io",
			FailurePolicy:           &failurePolicy,
			AdmissionReviewVersions: []string{"v1"},
			ClientConfig: admissionregistrationv1.WebhookClientConfig{
				CABundle: []byte("test-ca"),
				Service: &admissionregistrationv1.ServiceReference{
					Namespace: "opendatahub",
					Name:      "dashboard-operator-webhook",
					Path:      &path,
					Port:      &port,
				},
			},
			Rules: []admissionregistrationv1.RuleWithOperations{{
				Operations: []admissionregistrationv1.OperationType{admissionregistrationv1.Create},
				Rule: admissionregistrationv1.Rule{
					APIGroups:   []string{"components.platform.opendatahub.io"},
					APIVersions: []string{"v1alpha1"},
					Resources:   []string{"dashboards"},
				},
			}},
		}},
	}

	t.Run("selects valid webhook", func(t *testing.T) {
		target, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{valid})
		require.NoError(t, err)
		require.Equal(t, "dashboard-validating", target.configurationName)
		require.Equal(t, "dashboard-operator-webhook", target.serviceName)
		require.Equal(t, "/validate-dashboard", target.servicePath)
		require.Equal(t, int32(443), target.servicePort)
	})

	t.Run("rejects missing webhook", func(t *testing.T) {
		_, err := selectDashboardWebhook(nil)
		require.ErrorContains(t, err, "no validating webhook")
	})

	t.Run("rejects ambiguous webhooks", func(t *testing.T) {
		duplicate := valid.DeepCopy()
		duplicate.Name = "another-dashboard-validating"
		_, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{valid, *duplicate})
		require.ErrorContains(t, err, "expected exactly one")
	})

	t.Run("ignores cluster-wide wildcard webhook", func(t *testing.T) {
		clusterWide := valid.DeepCopy()
		clusterWide.Name = "cluster-wide-policy"
		clusterWide.Webhooks[0].Name = "validate-all.example.com"
		clusterWide.Webhooks[0].Rules[0].Rule = admissionregistrationv1.Rule{
			APIGroups:   []string{"*"},
			APIVersions: []string{"*"},
			Resources:   []string{"*"},
		}

		target, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{*clusterWide, valid})
		require.NoError(t, err)
		require.Equal(t, "dashboard-validating", target.configurationName)
	})

	t.Run("ignores namespaced webhook rule", func(t *testing.T) {
		namespacedScope := admissionregistrationv1.NamespacedScope
		namespaced := valid.DeepCopy()
		namespaced.Name = "namespaced-dashboard-validating"
		namespaced.Webhooks[0].Rules[0].Scope = &namespacedScope

		target, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{*namespaced, valid})
		require.NoError(t, err)
		require.Equal(t, "dashboard-validating", target.configurationName)
	})

	t.Run("rejects missing CA bundle", func(t *testing.T) {
		missingCA := valid.DeepCopy()
		missingCA.Webhooks[0].ClientConfig.CABundle = nil
		_, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{*missingCA})
		require.ErrorContains(t, err, "no CA bundle")
	})

	t.Run("rejects Ignore failure policy", func(t *testing.T) {
		ignore := admissionregistrationv1.Ignore
		wrongPolicy := valid.DeepCopy()
		wrongPolicy.Webhooks[0].FailurePolicy = &ignore
		_, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{*wrongPolicy})
		require.ErrorContains(t, err, "failurePolicy Fail")
	})

	t.Run("rejects missing Service path", func(t *testing.T) {
		missingPath := valid.DeepCopy()
		missingPath.Webhooks[0].ClientConfig.Service.Path = nil
		_, err := selectDashboardWebhook([]admissionregistrationv1.ValidatingWebhookConfiguration{*missingPath})
		require.ErrorContains(t, err, "must use a Service")
	})
}

func TestEquivalentCELRule(t *testing.T) {
	require.True(t, equivalentCELRule(" self.metadata.name\n == 'default-dashboard' ", dashboardCELRule))
	require.False(t, equivalentCELRule("self.metadata.name == 'other-dashboard'", dashboardCELRule))
	require.False(t, equivalentCELRule("self.metadata.name == 'default- dashboard'", dashboardCELRule))
}

func TestValidateCELRejection(t *testing.T) {
	invalid := apierrors.NewInvalid(
		schema.GroupKind{Group: "components.platform.opendatahub.io", Kind: "Dashboard"},
		"duplicate",
		nil,
	)
	invalid.ErrStatus.Message += ": " + dashboardCELValidationMessage

	require.NoError(t, validateCELRejection(invalid))
	require.ErrorContains(t, validateCELRejection(nil), "unexpectedly accepted")
	require.ErrorContains(t, validateCELRejection(errors.New("denied")), "must be Invalid")
}

func TestValidateWebhookRejection(t *testing.T) {
	forbidden := &apierrors.StatusError{ErrStatus: metav1.Status{
		Reason: metav1.StatusReasonForbidden,
		Code:   403,
		Message: "admission webhook \"validate.dashboard.platform.opendatahub.io\" denied the request: " +
			dashboardWebhookDenialMessage,
	}}

	require.NoError(t, validateWebhookRejection(forbidden))
	require.ErrorContains(t, validateWebhookRejection(nil), "unexpectedly accepted")
	require.ErrorContains(t, validateWebhookRejection(apierrors.NewAlreadyExists(
		schema.GroupResource{Group: "components.platform.opendatahub.io", Resource: "dashboards"},
		"default-dashboard",
	)), "AlreadyExists")
	require.ErrorContains(t, validateWebhookRejection(apierrors.NewForbidden(
		schema.GroupResource{Group: "components.platform.opendatahub.io", Resource: "dashboards"},
		"default-dashboard",
		errors.New("unrelated denial"),
	)), "does not prove")
}

func TestValidateRequiredReleases(t *testing.T) {
	valid := []common.ComponentRelease{
		{Name: "dashboard", Version: "v1.2.3-rc.1+build.7", RepoURL: dashboardRepositoryURL},
		{Name: common.ReleasePlatform, Version: "2.20.0"},
		{Name: "future-component", Version: "1.0.0"},
	}
	require.NoError(t, validateRequiredReleases(valid))

	tests := []struct {
		name     string
		mutate   func([]common.ComponentRelease) []common.ComponentRelease
		wantPart string
	}{
		{
			name: "missing platform",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				return releases[:1]
			},
			wantPart: `exactly one "platform" entry`,
		},
		{
			name: "duplicate dashboard",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				return append(releases, releases[0])
			},
			wantPart: `duplicate "dashboard" entries`,
		},
		{
			name: "duplicate optional release",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				return append(releases, releases[2])
			},
			wantPart: `duplicate "future-component" entries`,
		},
		{
			name: "unknown dashboard version",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				releases[0].Version = "unknown"
				return releases
			},
			wantPart: "is not semantic",
		},
		{
			name: "partial platform version",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				releases[1].Version = "2.20"
				return releases
			},
			wantPart: "is not semantic",
		},
		{
			name: "wrong dashboard repository",
			mutate: func(releases []common.ComponentRelease) []common.ComponentRelease {
				releases[0].RepoURL = "https://example.com/dashboard"
				return releases
			},
			wantPart: "repoUrl",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			releases := append([]common.ComponentRelease(nil), valid...)
			err := validateRequiredReleases(test.mutate(releases))
			require.ErrorContains(t, err, test.wantPart)
		})
	}
}
