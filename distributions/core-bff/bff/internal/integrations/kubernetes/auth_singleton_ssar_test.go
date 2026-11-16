package kubernetes

import (
	"context"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/client-go/kubernetes/fake"
	k8stesting "k8s.io/client-go/testing"
)

// newSSARCapturingClient returns a TokenKubernetesClient backed by a fake clientset that
// records the ResourceAttributes of every SelfSubjectAccessReview it receives and answers
// with the supplied allowed value.
func newSSARCapturingClient(allowed bool) (*TokenKubernetesClient, *[]authv1.ResourceAttributes) {
	captured := &[]authv1.ResourceAttributes{}

	cs := fake.NewSimpleClientset()
	cs.PrependReactor("create", "selfsubjectaccessreviews",
		func(action k8stesting.Action) (bool, runtime.Object, error) {
			createAction, ok := action.(k8stesting.CreateAction)
			if !ok {
				return false, nil, nil
			}
			sar, ok := createAction.GetObject().(*authv1.SelfSubjectAccessReview)
			if !ok {
				return false, nil, nil
			}
			if ra := sar.Spec.ResourceAttributes; ra != nil {
				*captured = append(*captured, *ra)
			}
			sar.Status = authv1.SubjectAccessReviewStatus{Allowed: allowed}
			return true, sar, nil
		})

	return &TokenKubernetesClient{
		SharedClientLogic: SharedClientLogic{
			Client: cs,
			Logger: slog.Default(),
			Token:  NewBearerToken("test-token"),
		},
	}, captured
}

// TestAuthSingletonSSAR_TargetsTheNameUsedToReadTheCR is the regression guard for
// RHOAIENG-103340.
//
// The admin/allowed SSARs previously named "default-auth" while the CR was read as "auth".
// That mismatch was invisible because the shipped ClusterRole grants `auths` with no
// resourceNames, so Kubernetes authorized against the resource type and never compared
// the name. Scoping that rule with resourceNames would have silently denied every admin.
//
// This asserts the SSAR targets models.AuthInstanceName - the same constant
// repositories.AuthRepository.GetAuth uses to fetch the CR. Reintroducing a separate
// name constant for the SSAR fails here. Deliberately not asserting a hardcoded literal:
// asserting "default-auth" is exactly what let the original bug survive review.
func TestAuthSingletonSSAR_TargetsTheNameUsedToReadTheCR(t *testing.T) {
	for _, tc := range []struct {
		name     string
		call     func(*TokenKubernetesClient) (bool, error)
		wantVerb string
	}{
		{
			name:     "IsUserAdmin",
			call:     func(c *TokenKubernetesClient) (bool, error) { return c.IsUserAdmin(context.Background(), nil) },
			wantVerb: "patch",
		},
		{
			name:     "IsUserAllowed",
			call:     func(c *TokenKubernetesClient) (bool, error) { return c.IsUserAllowed(context.Background(), nil) },
			wantVerb: "get",
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			client, captured := newSSARCapturingClient(true)

			allowed, err := tc.call(client)
			require.NoError(t, err)
			assert.True(t, allowed)

			require.Len(t, *captured, 1, "expected exactly one SSAR")
			ra := (*captured)[0]

			assert.Equal(t, models.AuthInstanceName, ra.Name,
				"SSAR must name the same Auth instance the repository reads; a divergent name "+
					"authorizes against a resource that cannot exist")
			assert.Equal(t, models.AuthGVR.Group, ra.Group)
			assert.Equal(t, models.AuthGVR.Resource, ra.Resource)
			assert.Equal(t, tc.wantVerb, ra.Verb)
		})
	}
}

// TestAuthInstanceName_MatchesCRDEnforcedValue pins the constant to the value the CRD's
// CEL rule `self.metadata.name == 'auth'` ("Auth name must be auth") permits. The API
// server rejects any other name at admission, so this is the one place a literal is
// correct: it encodes an external contract owned by the operator, not our own choice.
//
// Source: opendatahub-operator api/services/v1alpha1/auth_types.go
//
//	AuthInstanceName = "auth"
//	+kubebuilder:validation:XValidation:rule="self.metadata.name == 'auth'"
func TestAuthInstanceName_MatchesCRDEnforcedValue(t *testing.T) {
	assert.Equal(t, "auth", models.AuthInstanceName,
		"the Auth CRD rejects any name other than 'auth' at admission")
}
