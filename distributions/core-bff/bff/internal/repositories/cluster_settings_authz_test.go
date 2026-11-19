package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	authv1 "k8s.io/api/authorization/v1"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8stesting "k8s.io/client-go/testing"
)

// allowAllBut makes SelfSubjectAccessReviews allow every attribute except the
// verb/resource pairs listed in deny, and records every reviewed attribute.
func allowAllBut(p clientPair, deny map[string]bool) *[]authv1.ResourceAttributes {
	var seen []authv1.ResourceAttributes
	p.typed.PrependReactor("create", "selfsubjectaccessreviews", func(a k8stesting.Action) (bool, runtime.Object, error) {
		review := a.(k8stesting.CreateAction).GetObject().(*authv1.SelfSubjectAccessReview)
		attrs := *review.Spec.ResourceAttributes
		seen = append(seen, attrs)
		review.Status.Allowed = !deny[attrs.Verb+" "+attrs.Resource]
		return true, review, nil
	})
	return &seen
}

func writes(p clientPair) []string {
	var out []string
	for _, a := range p.typed.Actions() {
		switch a.GetVerb() {
		case "create", "update", "patch", "delete":
			if a.GetResource().Resource != "selfsubjectaccessreviews" {
				out = append(out, a.GetVerb()+" "+a.GetResource().Resource)
			}
		}
	}
	return out
}

func cullerEnabledSettings() *models.ClusterSettings {
	return &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 3600}
}

// Review (RHOAIENG-101218): a caller with partial permissions must be refused
// before the first write, so no partial change is committed.
func TestClusterSettings_AuthorizeUpdate_DeniesBeforeAnyWrite(t *testing.T) {
	caller := newClientPair(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: credNS}})
	allowAllBut(caller, map[string]bool{"update configmaps": true})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	err := repo.AuthorizeUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), nil)
	require.Error(t, err)
	assert.True(t, k8serrors.IsForbidden(err), "a denied write is a Forbidden error the handler surfaces as 403")
	assert.True(t, repo.SurfacesAuthFailure(err))
	assert.Empty(t, writes(caller), "nothing is written when any planned write is denied")
}

func TestClusterSettings_AuthorizeUpdate_ReviewsEveryPlannedWrite(t *testing.T) {
	caller := newClientPair(
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: credNS}},
	)
	seen := allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	require.NoError(t, repo.AuthorizeUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), nil))

	var got []string
	for _, a := range *seen {
		assert.Equal(t, credNS, a.Namespace)
		got = append(got, a.Verb+" "+a.Group+"/"+a.Resource+" "+a.Name)
	}
	assert.Equal(t, []string{
		"patch opendatahub.io/odhdashboardconfigs odh-dashboard-config",
		"create /configmaps ",                                // culler ConfigMap absent: created
		"update /configmaps " + segmentKeyConfigName,         // segment-key ConfigMap present: updated
		"patch apps/deployments " + notebookControllerDeploy, // culler changed: rollout
	}, got)
	assert.Empty(t, writes(caller), "the check itself writes nothing")
}

func TestClusterSettings_AuthorizeUpdate_DisabledCullerReviewsDelete(t *testing.T) {
	caller := newClientPair()
	seen := allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}
	require.NoError(t, repo.AuthorizeUpdate(context.Background(), credNS, "odh-dashboard-config", settings, nil))
	var verbs []string
	for _, a := range *seen {
		verbs = append(verbs, a.Verb+" "+a.Resource+" "+a.Name)
	}
	assert.Contains(t, verbs, "delete configmaps "+cullerConfigName)
}

func TestClusterSettings_AuthorizeUpdate_ServiceAccountPolicyUnchanged(t *testing.T) {
	sa := newClientPair()
	repo := NewClusterSettingsRepository(sa.typed)
	require.NoError(t, repo.AuthorizeUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), nil))
	assert.Zero(t, sa.actions(), "OpenShift keeps the service-account model: no caller review is made")
	assert.False(t, repo.SurfacesAuthFailure(k8serrors.NewForbidden(corev1.Resource("configmaps"), "x", nil)))
}

func TestClusterSettings_AuthorizeUpdate_NoCallerNoFallback(t *testing.T) {
	sa := newClientPair()
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, saTyped: sa.typed, caller: failingCaller}}
	err := repo.AuthorizeUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), nil)
	require.ErrorIs(t, err, ErrCallerClientsUnavailable)
	assert.Zero(t, sa.actions())
}
