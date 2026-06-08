package repositories

import (
	"context"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	corev1 "k8s.io/api/core/v1"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes/fake"
)

const testNS = "test-ns"

func cullerCM(enableCulling bool, idleTime string) *corev1.ConfigMap {
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: cullerConfigName, Namespace: testNS},
		Data: map[string]string{
			"ENABLE_CULLING": func() string {
				if enableCulling {
					return "true"
				}
				return "false"
			}(),
			"CULL_IDLE_TIME": idleTime,
		},
	}
}

func segmentCM(enabled bool) *corev1.ConfigMap {
	val := "false"
	if enabled {
		val = "true"
	}
	return &corev1.ConfigMap{
		ObjectMeta: metav1.ObjectMeta{Name: segmentKeyConfigName, Namespace: testNS},
		Data:       map[string]string{"segmentKeyEnabled": val},
	}
}

func defaultDashConfig() *models.DashboardConfig {
	return &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			DashboardConfig: models.DashboardFeatureFlags{},
			NotebookController: &models.NotebookController{
				Enabled: true,
			},
		},
	}
}

func TestGetClusterSettings_WithCullerEnabled(t *testing.T) {
	cs := fake.NewSimpleClientset(cullerCM(true, "30"))
	repo := NewClusterSettingsRepository(cs)

	settings, err := repo.GetClusterSettings(context.Background(), testNS, defaultDashConfig())
	require.NoError(t, err)
	assert.Equal(t, 1800, settings.CullerTimeout) // 30 min * 60
}

func TestGetClusterSettings_WithCullerDisabled(t *testing.T) {
	cs := fake.NewSimpleClientset(cullerCM(false, "30"))
	repo := NewClusterSettingsRepository(cs)

	settings, err := repo.GetClusterSettings(context.Background(), testNS, defaultDashConfig())
	require.NoError(t, err)
	assert.Equal(t, defaultCullerTimeout, settings.CullerTimeout)
}

func TestGetClusterSettings_NoCullerCM(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewClusterSettingsRepository(cs)

	settings, err := repo.GetClusterSettings(context.Background(), testNS, defaultDashConfig())
	require.NoError(t, err)
	assert.Equal(t, defaultCullerTimeout, settings.CullerTimeout)
}

func TestGetClusterSettings_TrackingEnabled(t *testing.T) {
	cs := fake.NewSimpleClientset(segmentCM(true))
	repo := NewClusterSettingsRepository(cs)

	settings, err := repo.GetClusterSettings(context.Background(), testNS, defaultDashConfig())
	require.NoError(t, err)
	assert.True(t, settings.UserTrackingEnabled)
}

func TestUpdateCullerConfig_EnablesCulling(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewClusterSettingsRepository(cs)
	ctx := context.Background()

	err := repo.updateCullerConfig(ctx, testNS, 1800) // 30 minutes
	require.NoError(t, err)

	cm, err := cs.CoreV1().ConfigMaps(testNS).Get(ctx, cullerConfigName, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "true", cm.Data["ENABLE_CULLING"])
	assert.Equal(t, "30", cm.Data["CULL_IDLE_TIME"])
	assert.Equal(t, defaultIdlenessCheckPeriod, cm.Data["IDLENESS_CHECK_PERIOD"])
}

func TestUpdateCullerConfig_DisablesCulling(t *testing.T) {
	cs := fake.NewSimpleClientset(cullerCM(true, "30"))
	repo := NewClusterSettingsRepository(cs)
	ctx := context.Background()

	err := repo.updateCullerConfig(ctx, testNS, defaultCullerTimeout)
	require.NoError(t, err)

	_, err = cs.CoreV1().ConfigMaps(testNS).Get(ctx, cullerConfigName, metav1.GetOptions{})
	assert.True(t, k8serrors.IsNotFound(err), "culler CM should be deleted")
}

func TestUpdateCullerConfig_UpdatesExisting(t *testing.T) {
	cs := fake.NewSimpleClientset(cullerCM(true, "30"))
	repo := NewClusterSettingsRepository(cs)
	ctx := context.Background()

	err := repo.updateCullerConfig(ctx, testNS, 3600) // 60 minutes
	require.NoError(t, err)

	cm, err := cs.CoreV1().ConfigMaps(testNS).Get(ctx, cullerConfigName, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "true", cm.Data["ENABLE_CULLING"])
	assert.Equal(t, "60", cm.Data["CULL_IDLE_TIME"])
}

func TestUpdateSegmentKeyConfig(t *testing.T) {
	cs := fake.NewSimpleClientset(segmentCM(false))
	repo := NewClusterSettingsRepository(cs)
	ctx := context.Background()

	err := repo.updateSegmentKeyConfig(ctx, testNS, true)
	require.NoError(t, err)

	cm, err := cs.CoreV1().ConfigMaps(testNS).Get(ctx, segmentKeyConfigName, metav1.GetOptions{})
	require.NoError(t, err)
	assert.Equal(t, "true", cm.Data["segmentKeyEnabled"])
}

func TestDetectChanges_PVCChanged(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewClusterSettingsRepository(cs)

	pvc := "20Gi"
	config := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			NotebookController: &models.NotebookController{PVCSize: &pvc},
		},
	}
	settings := &models.ClusterSettings{PVCSize: 50}

	assert.True(t, repo.detectChanges(context.Background(), testNS, settings, config))
}

func TestDetectChanges_CullerChanged(t *testing.T) {
	cs := fake.NewSimpleClientset(cullerCM(true, "30"))
	repo := NewClusterSettingsRepository(cs)

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: 7200}

	assert.True(t, repo.detectChanges(context.Background(), testNS, settings, defaultDashConfig()))
}

func TestDetectChanges_NoChanges(t *testing.T) {
	cs := fake.NewSimpleClientset()
	repo := NewClusterSettingsRepository(cs)

	settings := &models.ClusterSettings{PVCSize: defaultPVCSize, CullerTimeout: defaultCullerTimeout}

	assert.False(t, repo.detectChanges(context.Background(), testNS, settings, defaultDashConfig()))
}

func TestApplyDashboardConfigToSettings(t *testing.T) {
	strategy := "rolling"
	isDefault := true
	pvc := "50Gi"

	config := &models.DashboardConfig{
		Spec: models.DashboardConfigSpec{
			DashboardConfig: models.DashboardFeatureFlags{
				DisableKServe: true,
				DisableLLMd:   false,
			},
			ModelServing: &models.ModelServingConfig{
				DeploymentStrategy: &strategy,
				IsLLMdDefault:      &isDefault,
			},
			NotebookController: &models.NotebookController{
				PVCSize: &pvc,
			},
		},
	}

	settings := models.DefaultClusterSettings
	applyDashboardConfigToSettings(config, &settings)

	assert.False(t, settings.ModelServingPlatformEnabled.KServe)
	assert.True(t, settings.ModelServingPlatformEnabled.LLMd)
	assert.Equal(t, "rolling", settings.DefaultDeploymentStrategy)
	assert.Equal(t, true, *settings.IsDistributedInferencingDefault)
	assert.Equal(t, 50, settings.PVCSize)
}
