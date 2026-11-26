package repositories

import (
	"context"
	"errors"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
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

func planErr(_ *ClusterSettingsPlan, err error) error { return err }

func cullerEnabledSettings() *models.ClusterSettings {
	return &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 3600}
}

// Review (RHOAIENG-101218): a caller with partial permissions must be refused
// before the first write, so no partial change is committed.
func TestClusterSettings_PlanUpdate_DeniesBeforeAnyWrite(t *testing.T) {
	caller := newClientPair(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: credNS}, Data: map[string]string{keySegmentKeyEnabled: "true"}})
	allowAllBut(caller, map[string]bool{"update configmaps": true})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	_, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.Error(t, err)
	assert.True(t, k8serrors.IsForbidden(err), "a denied write is a Forbidden error the handler surfaces as 403")
	assert.True(t, repo.SurfacesAuthFailure(err))
	assert.Empty(t, writes(caller), "nothing is written when any planned write is denied")
}

func TestClusterSettings_PlanUpdate_ReviewsEveryPlannedWrite(t *testing.T) {
	caller := newClientPair(
		&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: credNS}, Data: map[string]string{keySegmentKeyEnabled: "true"}},
	)
	seen := allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	require.NoError(t, planErr(repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())))

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

func TestClusterSettings_PlanUpdate_DisabledCullerReviewsDelete(t *testing.T) {
	caller := newClientPair(versioned(cullerCM(true, "60"), "1"))
	seen := allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}
	require.NoError(t, planErr(repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", settings, nil)))
	var verbs []string
	for _, a := range *seen {
		verbs = append(verbs, a.Verb+" "+a.Resource+" "+a.Name)
	}
	assert.Contains(t, verbs, "delete configmaps "+cullerConfigName)
}

func TestClusterSettings_PlanUpdate_ServiceAccountPolicyUnchanged(t *testing.T) {
	sa := newClientPair()
	repo := NewClusterSettingsRepository(sa.typed)
	require.NoError(t, planErr(repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())))
	for _, a := range sa.typed.Actions() {
		assert.NotEqual(t, "selfsubjectaccessreviews", a.GetResource().Resource,
			"OpenShift keeps the service-account model: no caller review is made")
	}
	assert.Empty(t, writes(sa), "planning writes nothing")
	assert.False(t, repo.SurfacesAuthFailure(k8serrors.NewForbidden(corev1.Resource("configmaps"), "x", nil)))
}

func TestClusterSettings_PlanUpdate_NoCallerNoFallback(t *testing.T) {
	sa := newClientPair()
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, saTyped: sa.typed, caller: failingCaller}}
	_, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.ErrorIs(t, err, ErrCallerClientsUnavailable)
	assert.Zero(t, sa.actions())
}

// Review (RHOAIENG-96081): the writes executed are the ones the preflight
// checked. If the culler ConfigMap appears after a plan to create it, the
// update fails instead of switching to an update the caller was not checked for.
func TestClusterSettings_UpdateConfigMaps_ExecutesPlannedCreateOnly(t *testing.T) {
	caller := newClientPair()
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.NoError(t, err)

	// The ConfigMap appears between the preflight and the write.
	require.NoError(t, caller.typed.Tracker().Add(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: cullerConfigName, Namespace: credNS}}))

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.Error(t, err)
	assert.True(t, k8serrors.IsAlreadyExists(err), "the planned create fails; it is not turned into an update: %v", err)
	assert.Equal(t, []string{"create configmaps"}, writes(caller), "no unplanned write runs")
}

func TestClusterSettings_UpdateConfigMaps_ExecutesPlannedUpdateOnly(t *testing.T) {
	caller := newClientPair(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: cullerConfigName, Namespace: credNS}})
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.NoError(t, err)

	// The ConfigMap is deleted between the preflight and the write.
	require.NoError(t, caller.typed.Tracker().Delete(corev1.SchemeGroupVersion.WithResource("configmaps"), credNS, cullerConfigName))

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.Error(t, err)
	assert.True(t, k8serrors.IsConflict(err), "the planned update fails; it is not turned into a create: %v", err)
	assert.Equal(t, []string{"update configmaps"}, writes(caller), "no unplanned write runs")
}

func TestClusterSettings_UpdateConfigMaps_RequiresPlan(t *testing.T) {
	repo := NewClusterSettingsRepository(newClientPair().typed)
	require.Error(t, repo.UpdateConfigMaps(context.Background(), credNS, nil))
}

// Review (RHOAIENG-96081): with culling already off and its ConfigMap absent,
// there is nothing to delete, so a caller without delete may still save.
func TestClusterSettings_PlanUpdate_DisabledCullerAbsent_NoDeleteReview(t *testing.T) {
	caller := newClientPair()
	seen := allowAllBut(caller, map[string]bool{"delete configmaps": true})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}
	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", settings, nil)
	require.NoError(t, err)
	for _, a := range *seen {
		assert.NotEqual(t, "delete", a.Verb, "no delete is reviewed for an absent ConfigMap")
	}
	require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
	assert.Empty(t, writes(caller))
}

// Review (RHOAIENG-96081): a ConfigMap the plan left alone because it was
// absent, but which appears before the writes, is a conflict, not a success.
func TestClusterSettings_UpdateConfigMaps_AbsentMapAppearsAfterPlan_Conflict(t *testing.T) {
	for _, tc := range []struct {
		name     string
		settings *models.ClusterSettings
		cm       string
	}{
		{"segment key", &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 3600}, segmentKeyConfigName},
		{"culler already off", &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}, cullerConfigName},
	} {
		t.Run(tc.name, func(t *testing.T) {
			caller := newClientPair()
			allowAllBut(caller, nil)
			repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

			plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", tc.settings, defaultDashConfig())
			require.NoError(t, err)
			require.NoError(t, caller.typed.Tracker().Add(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: tc.cm, Namespace: credNS}}))

			err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
			require.Error(t, err)
			assert.True(t, k8serrors.IsConflict(err), "%v", err)
		})
	}
}

func TestClusterSettings_UpdateConfigMaps_SegmentKeyDeletedAfterPlan_Conflict(t *testing.T) {
	caller := newClientPair(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: credNS}})
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.NoError(t, err)
	require.NoError(t, caller.typed.Tracker().Delete(corev1.SchemeGroupVersion.WithResource("configmaps"), credNS, segmentKeyConfigName))

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.Error(t, err)
	assert.True(t, k8serrors.IsConflict(err), "%v", err)
}

// Review (RHOAIENG-96081): a denied culler read is an error, never a detected
// change, so it cannot trigger a notebook-controller restart.
func TestClusterSettings_DeniedCullerRead_NoRollout(t *testing.T) {
	caller := newClientPair(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: cullerConfigName, Namespace: credNS}})
	allowAllBut(caller, nil)
	caller.typed.PrependReactor("get", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		if a.(k8stesting.GetAction).GetName() != cullerConfigName {
			return false, nil, nil
		}
		return true, nil, k8serrors.NewForbidden(corev1.Resource("configmaps"), cullerConfigName, nil)
	})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.buildPlan(context.Background(), caller.typed, credNS, "odh-dashboard-config",
		&models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}, nil)
	require.Error(t, err)
	assert.Nil(t, plan)

	_, err = repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.True(t, k8serrors.IsForbidden(err), "%v", err)
	assert.Empty(t, writes(caller), "nothing is written, the rollout included")
}

// enforceResourceVersion makes the fake API server reject a ConfigMap update or
// delete whose resourceVersion is not the stored one, as a real one does.
func enforceResourceVersion(p clientPair) {
	gvr := corev1.SchemeGroupVersion.WithResource("configmaps")
	stored := func(ns, name string) string {
		obj, err := p.typed.Tracker().Get(gvr, ns, name)
		if err != nil {
			return ""
		}
		return obj.(*corev1.ConfigMap).ResourceVersion
	}
	p.typed.PrependReactor("update", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		cm := a.(k8stesting.UpdateAction).GetObject().(*corev1.ConfigMap)
		if rv := stored(a.GetNamespace(), cm.Name); rv != "" && rv != cm.ResourceVersion {
			return true, nil, k8serrors.NewConflict(corev1.Resource("configmaps"), cm.Name, nil)
		}
		return false, nil, nil
	})
	p.typed.PrependReactor("delete", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		d := a.(k8stesting.DeleteActionImpl)
		pre := d.DeleteOptions.Preconditions
		if pre != nil && pre.ResourceVersion != nil {
			if rv := stored(d.Namespace, d.Name); rv != "" && rv != *pre.ResourceVersion {
				return true, nil, k8serrors.NewConflict(corev1.Resource("configmaps"), d.Name, nil)
			}
		}
		return false, nil, nil
	})
}

func versioned(cm *corev1.ConfigMap, rv string) *corev1.ConfigMap {
	cm = cm.DeepCopy()
	cm.Namespace = credNS
	cm.ResourceVersion = rv
	return cm
}

func setConfigMap(t *testing.T, p clientPair, cm *corev1.ConfigMap) {
	t.Helper()
	require.NoError(t, p.typed.Tracker().Update(corev1.SchemeGroupVersion.WithResource("configmaps"), cm, credNS))
}

func rolledOut(p clientPair) bool {
	for _, a := range p.typed.Actions() {
		if a.GetVerb() == "patch" && a.GetResource().Resource == "deployments" {
			return true
		}
	}
	return false
}

// Review 6037661521 item 3: a change to another setting needs no write access
// to a ConfigMap whose stored value already matches the request.
func TestClusterSettings_PlanUpdate_UnchangedConfigMapsNeedNoWrite(t *testing.T) {
	caller := newClientPair(versioned(cullerCM(true, "60"), "1"), versioned(segmentCM(true), "1"))
	seen := allowAllBut(caller, map[string]bool{"update configmaps": true, "delete configmaps": true, "create configmaps": true})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 3600, UserTrackingEnabled: true}
	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", settings, defaultDashConfig())
	require.NoError(t, err, "only the OdhDashboardConfig patch is needed")
	require.Len(t, *seen, 1)
	assert.Equal(t, "odhdashboardconfigs", (*seen)[0].Resource)

	require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
	assert.Empty(t, writes(caller), "no ConfigMap write and no rollout")
}

// Review 6037661521 item 2: a save planned from an older culler value must not
// overwrite a newer one and skip the restart; the write is bound to the read.
func TestClusterSettings_UpdateConfigMaps_CullerChangedAfterPlan_Conflict(t *testing.T) {
	for _, tc := range []struct {
		name    string
		timeout int
	}{
		{"planned update", 7200},
		{"planned delete", defaultCullerTimeout},
		{"left alone", 3600},
	} {
		t.Run(tc.name, func(t *testing.T) {
			caller := newClientPair(versioned(cullerCM(true, "60"), "1"))
			enforceResourceVersion(caller)
			allowAllBut(caller, nil)
			repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

			plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config",
				&models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: tc.timeout}, defaultDashConfig())
			require.NoError(t, err)

			// Another save stores a different timeout between the plan and the write.
			setConfigMap(t, caller, versioned(cullerCM(true, "120"), "2"))
			caller.typed.ClearActions()

			err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
			require.Error(t, err)
			assert.True(t, k8serrors.IsConflict(err), "%v", err)
			assert.False(t, rolledOut(caller), "no rollout from a stale decision")
			cm, getErr := caller.typed.CoreV1().ConfigMaps(credNS).Get(context.Background(), cullerConfigName, metav1.GetOptions{})
			require.NoError(t, getErr)
			assert.Equal(t, "120", cm.Data[keyCullIdleTime], "the newer value is kept")
		})
	}
}

// Review 6037661521 item 1: a conflict on the segment-key ConfigMap stops the
// update before the culler ConfigMap is written, so the retry still sees the
// culler change and restarts the controller.
func TestClusterSettings_SegmentKeyConflict_RetryStillRollsOut(t *testing.T) {
	caller := newClientPair(&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: notebookControllerDeploy, Namespace: credNS}})
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}
	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 3600}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", settings, defaultDashConfig())
	require.NoError(t, err)
	require.NoError(t, caller.typed.Tracker().Add(versioned(segmentCM(false), "1")))

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.True(t, k8serrors.IsConflict(err), "%v", err)
	_, getErr := caller.typed.CoreV1().ConfigMaps(credNS).Get(context.Background(), cullerConfigName, metav1.GetOptions{})
	assert.True(t, k8serrors.IsNotFound(getErr), "the culler ConfigMap is not written before the conflict")

	caller.typed.ClearActions()
	plan, err = repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", settings, defaultDashConfig())
	require.NoError(t, err)
	require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
	assert.True(t, rolledOut(caller), "the retry restarts the controller")
}

// Review 6037661521 item 1: the OdhDashboardConfig patch has already stored a
// new PVC size when a ConfigMap conflict is found, so the planned rollout still
// runs; a retry would see the PVC size as stored.
func TestClusterSettings_ConflictAfterPVCChange_StillRollsOut(t *testing.T) {
	caller := newClientPair(&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: notebookControllerDeploy, Namespace: credNS}})
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config",
		&models.ClusterSettings{PVCSize: 75, CullerTimeout: defaultCullerTimeout}, defaultDashConfig())
	require.NoError(t, err)
	require.NoError(t, caller.typed.Tracker().Add(versioned(segmentCM(false), "1")))
	caller.typed.ClearActions()

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.True(t, k8serrors.IsConflict(err), "the conflict is still reported: %v", err)
	assert.True(t, rolledOut(caller))
}

// Review 6041827828 item 2: GET and write planning read the stored values the
// same way, so saving exactly what GET returned plans no ConfigMap write and no
// rollout, whatever representation of "off" is stored.
func TestClusterSettings_SavingWhatGetShows_PlansNoConfigMapWrite(t *testing.T) {
	disabledTracking := defaultDashConfig()
	disabledTracking.Spec.DashboardConfig.DisableTracking = true
	for _, tc := range []struct {
		name string
		cfg  *models.DashboardConfig
		cms  []runtime.Object
	}{
		{"nothing stored", defaultDashConfig(), nil},
		{"culling enabled", defaultDashConfig(), []runtime.Object{versioned(cullerCM(true, "60"), "1")}},
		{"ENABLE_CULLING=false", defaultDashConfig(), []runtime.Object{versioned(cullerCM(false, "60"), "1")}},
		{"culler map with no data", defaultDashConfig(), []runtime.Object{versioned(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: cullerConfigName}}, "1")}},
		{"segmentKeyEnabled absent", defaultDashConfig(), []runtime.Object{versioned(&corev1.ConfigMap{ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName}, Data: map[string]string{"segmentKey": "k"}}, "1")}},
		{"tracking enabled", defaultDashConfig(), []runtime.Object{versioned(segmentCM(true), "1")}},
		{"tracking disabled in the dashboard config", disabledTracking, []runtime.Object{versioned(segmentCM(true), "1")}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			caller := newClientPair(tc.cms...)
			seen := allowAllBut(caller, map[string]bool{"update configmaps": true, "delete configmaps": true, "create configmaps": true, "patch deployments": true})
			repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

			shown, err := repo.GetClusterSettings(context.Background(), credNS, tc.cfg)
			require.NoError(t, err)
			plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", shown, tc.cfg)
			require.NoError(t, err, "a save of the values GET showed needs no ConfigMap or Deployment write")
			require.Len(t, *seen, 1)
			assert.Equal(t, "odhdashboardconfigs", (*seen)[0].Resource)
			require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
			assert.Empty(t, writes(caller))
		})
	}
}

// Review 6041827828 item 5: when a ConfigMap conflict is followed by a denied
// rollout, both causes are kept and the denial decides the status.
func TestClusterSettings_ConflictThenDeniedRollout_DenialWins(t *testing.T) {
	caller := newClientPair(&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: notebookControllerDeploy, Namespace: credNS}})
	allowAllBut(caller, nil)
	caller.typed.PrependReactor("patch", "deployments", func(k8stesting.Action) (bool, runtime.Object, error) {
		return true, nil, k8serrors.NewForbidden(appsv1.Resource("deployments"), notebookControllerDeploy, nil)
	})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config",
		&models.ClusterSettings{PVCSize: 75, CullerTimeout: defaultCullerTimeout}, defaultDashConfig())
	require.NoError(t, err)
	require.NoError(t, caller.typed.Tracker().Add(versioned(segmentCM(true), "1")))

	err = repo.UpdateConfigMaps(context.Background(), credNS, plan)
	require.Error(t, err)
	assert.True(t, k8serrors.IsForbidden(err), "the denial decides the status: %v", err)
	assert.True(t, repo.SurfacesAuthFailure(err))
	assert.Contains(t, err.Error(), "after the update was planned", "the conflict is kept too")
}

// Review pass 1: with disableTracking, GET never reads the segment-key
// ConfigMap, so a save must not need access to it either.
func TestClusterSettings_TrackingDisabled_SegmentKeyNotRead(t *testing.T) {
	caller := newClientPair(versioned(segmentCM(true), "1"))
	allowAllBut(caller, nil)
	caller.typed.PrependReactor("get", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		if a.(k8stesting.GetAction).GetName() != segmentKeyConfigName {
			return false, nil, nil
		}
		return true, nil, k8serrors.NewForbidden(corev1.Resource("configmaps"), segmentKeyConfigName, nil)
	})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}
	cfg := defaultDashConfig()
	cfg.Spec.DashboardConfig.DisableTracking = true

	shown, err := repo.GetClusterSettings(context.Background(), credNS, cfg)
	require.NoError(t, err, "GET does not read the segment key")
	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", shown, cfg)
	require.NoError(t, err, "nor does the save plan")
	require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
	assert.Empty(t, writes(caller))
}

// Review pass 2: enabling tracking without a provisioned segment-key ConfigMap
// fails before any write instead of reporting success for nothing stored.
func TestClusterSettings_EnableTrackingWithoutSegmentKey_FailsBeforeWrites(t *testing.T) {
	caller := newClientPair()
	allowAllBut(caller, nil)
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	_, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config",
		&models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout, UserTrackingEnabled: true}, defaultDashConfig())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not provisioned")
	assert.False(t, repo.SurfacesAuthFailure(err), "a 200 success=false, not 403")
	assert.Empty(t, writes(caller))
}

// Review pass 2: under the caller policy GET and the save plan fail the same
// way on a segment-key read error; GET never shows a value it did not read.
func TestClusterSettings_SegmentKeyReadError_GetAndPlanAgree(t *testing.T) {
	caller := newClientPair(versioned(segmentCM(true), "1"))
	allowAllBut(caller, nil)
	caller.typed.PrependReactor("get", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		if a.(k8stesting.GetAction).GetName() != segmentKeyConfigName {
			return false, nil, nil
		}
		return true, nil, k8serrors.NewInternalError(errors.New("etcd timeout"))
	})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	_, getErr := repo.GetClusterSettings(context.Background(), credNS, defaultDashConfig())
	_, planErr := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.Error(t, getErr)
	require.Error(t, planErr)
}

// Review pass 5: under the service-account policy GET shows an unreadable
// segment-key ConfigMap as tracking off (as before), and saving that value
// leaves the ConfigMap alone instead of failing; enabling tracking still fails.
func TestClusterSettings_SegmentKeyReadError_ServiceAccountGetAndSaveAgree(t *testing.T) {
	sa := newClientPair(versioned(segmentCM(true), "1"),
		&appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: notebookControllerDeploy, Namespace: credNS}})
	sa.typed.PrependReactor("get", "configmaps", func(a k8stesting.Action) (bool, runtime.Object, error) {
		if a.(k8stesting.GetAction).GetName() != segmentKeyConfigName {
			return false, nil, nil
		}
		return true, nil, k8serrors.NewInternalError(errors.New("etcd timeout"))
	})
	repo := NewClusterSettingsRepository(sa.typed)

	shown, err := repo.GetClusterSettings(context.Background(), credNS, defaultDashConfig())
	require.NoError(t, err)
	assert.False(t, shown.UserTrackingEnabled)

	plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", shown, defaultDashConfig())
	require.NoError(t, err, "saving what GET showed does not fail on the read GET tolerated")
	require.NoError(t, repo.VerifyPlanStillHolds(context.Background(), credNS, plan))
	require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
	for _, w := range writes(sa) {
		assert.NotEqual(t, "update configmaps", w, "the unreadable ConfigMap is left alone")
	}

	enable := *shown
	enable.UserTrackingEnabled = true
	_, err = repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", &enable, defaultDashConfig())
	require.Error(t, err)
}

// Review pass 7: culling switched on without a readable idle time shows as
// off in GET while the controller still culls; saving "off" deletes the map.
func TestClusterSettings_CullingOnWithoutIdleTime_SaveOffDeletes(t *testing.T) {
	for _, idle := range []string{"", "abc"} {
		cm := versioned(cullerCM(true, idle), "1")
		if idle == "" {
			delete(cm.Data, keyCullIdleTime)
		}
		cm.Data[keyCullingEnabled] = "True"
		caller := newClientPair(cm, &appsv1.Deployment{ObjectMeta: metav1.ObjectMeta{Name: notebookControllerDeploy, Namespace: credNS}})
		allowAllBut(caller, nil)
		repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

		shown, err := repo.GetClusterSettings(context.Background(), credNS, defaultDashConfig())
		require.NoError(t, err)
		require.Equal(t, defaultCullerTimeout, shown.CullerTimeout)
		plan, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", shown, defaultDashConfig())
		require.NoError(t, err)
		assert.Equal(t, cullerOpDelete, plan.cullerOp, "idle=%q", idle)
		assert.True(t, plan.rollout, "the controller is restarted so culling stops, idle=%q", idle)
		require.NoError(t, repo.UpdateConfigMaps(context.Background(), credNS, plan))
		_, getErr := caller.typed.CoreV1().ConfigMaps(credNS).Get(context.Background(), cullerConfigName, metav1.GetOptions{})
		assert.True(t, k8serrors.IsNotFound(getErr))
	}
}

// Review 6072972056 item 3: with tracking disabled in the dashboard config, an
// opt-in is refused before any write instead of reporting success while the
// setting stays off. Under both policies, and without reading the segment key.
func TestClusterSettings_TrackingOptInWhileDisabled_FailsBeforeWrites(t *testing.T) {
	for _, policy := range []CredentialPolicy{CredentialPolicyCaller, CredentialPolicyServiceAccount} {
		t.Run(string(policy), func(t *testing.T) {
			pair := newClientPair(versioned(segmentCM(false), "1"))
			seen := allowAllBut(pair, nil)
			repo := &ClusterSettingsRepository{clients: clientSource{policy: policy, caller: callerFrom(pair), saTyped: pair.typed, saDyn: pair.dyn}}
			cfg := defaultDashConfig()
			cfg.Spec.DashboardConfig.DisableTracking = true

			_, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config",
				&models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout, UserTrackingEnabled: true}, cfg)
			require.Error(t, err)
			assert.Contains(t, err.Error(), "tracking is disabled in the dashboard config")
			assert.False(t, repo.SurfacesAuthFailure(err), "a 200 success=false, not 403")
			assert.Empty(t, *seen, "refused before any access review")
			assert.Empty(t, writes(pair))
		})
	}
}

// Review 6072972056 item 4: an access review the authorizer could not evaluate
// blocks the save before any write, but is reported as an upstream failure,
// not as a denial of the caller's permission.
func TestClusterSettings_AccessReviewEvaluationError_IsNotADenial(t *testing.T) {
	caller := newClientPair()
	caller.typed.PrependReactor("create", "selfsubjectaccessreviews", func(a k8stesting.Action) (bool, runtime.Object, error) {
		review := a.(k8stesting.CreateAction).GetObject().(*authv1.SelfSubjectAccessReview)
		review.Status = authv1.SubjectAccessReviewStatus{EvaluationError: "webhook authorizer unavailable"}
		return true, review, nil
	})
	repo := &ClusterSettingsRepository{clients: clientSource{policy: CredentialPolicyCaller, caller: callerFrom(caller)}}

	_, err := repo.PlanUpdate(context.Background(), credNS, "odh-dashboard-config", cullerEnabledSettings(), defaultDashConfig())
	require.Error(t, err)
	assert.False(t, k8serrors.IsForbidden(err), "not a denial: %v", err)
	assert.False(t, repo.SurfacesAuthFailure(err))
	assert.Contains(t, err.Error(), "could not be evaluated")
	assert.NotContains(t, err.Error(), "webhook authorizer unavailable", "no upstream text")
	assert.Empty(t, writes(caller))
}
