package pgvector

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	networkingv1 "k8s.io/api/networking/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"sigs.k8s.io/controller-runtime/pkg/client"
	"sigs.k8s.io/controller-runtime/pkg/client/fake"
)

func testScheme() *runtime.Scheme {
	s := runtime.NewScheme()
	_ = corev1.AddToScheme(s)
	_ = appsv1.AddToScheme(s)
	_ = networkingv1.AddToScheme(s)
	return s
}

func testOpts() Options {
	return Options{
		Image: "registry.example.com/postgresql-16:latest",
		OGXServerLabelSelector: map[string]string{
			"app": "lsd-genai-playground",
		},
	}
}

func TestEnsurePostgres_CreatesAllResources(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()
	ns := "test-ns"

	conn, err := EnsurePostgres(ctx, c, ns, testOpts())
	require.NoError(t, err)
	require.NotNil(t, conn)

	assert.Equal(t, "genai-pgvector.test-ns.svc.cluster.local", conn.Host)
	assert.Equal(t, DefaultPort, conn.Port)
	assert.Equal(t, DefaultDB, conn.DB)
	assert.Equal(t, DefaultUser, conn.User)
	assert.Equal(t, CredentialsSecretName, conn.PasswordSecret.Name)
	assert.Equal(t, DefaultPasswordKey, conn.PasswordSecret.Key)

	// Verify Secret
	var secret corev1.Secret
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: CredentialsSecretName, Namespace: ns}, &secret))
	assert.NotEmpty(t, secret.Data[DefaultPasswordKey])
	assert.Equal(t, ManagedLabelValue, secret.Labels[ManagedLabel])

	// Verify PVC
	var pvc corev1.PersistentVolumeClaim
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: StoragePVCName, Namespace: ns}, &pvc))
	assert.Equal(t, ManagedLabelValue, pvc.Labels[ManagedLabel])

	// Verify Deployment
	var deploy appsv1.Deployment
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: DeploymentName, Namespace: ns}, &deploy))
	assert.Equal(t, ManagedLabelValue, deploy.Labels[ManagedLabel])
	assert.Equal(t, "registry.example.com/postgresql-16:latest", deploy.Spec.Template.Spec.Containers[0].Image)

	// Verify Service
	var svc corev1.Service
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: ServiceName, Namespace: ns}, &svc))
	assert.Equal(t, ManagedLabelValue, svc.Labels[ManagedLabel])
	assert.Equal(t, int32(DefaultPort), svc.Spec.Ports[0].Port)

	// Verify NetworkPolicy
	var netpol networkingv1.NetworkPolicy
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: NetworkPolicyName, Namespace: ns}, &netpol))
	assert.Equal(t, ManagedLabelValue, netpol.Labels[ManagedLabel])
	require.Len(t, netpol.Spec.Ingress, 1)
	require.Len(t, netpol.Spec.Ingress[0].From, 1)
	assert.Equal(t, "lsd-genai-playground", netpol.Spec.Ingress[0].From[0].PodSelector.MatchLabels["app"])
}

func TestEnsurePostgres_SkipsIfExists(t *testing.T) {
	existingDeploy := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      DeploymentName,
			Namespace: "test-ns",
			Labels:    managedLabels(),
		},
	}
	existingSecret := &corev1.Secret{
		ObjectMeta: metav1.ObjectMeta{
			Name:      CredentialsSecretName,
			Namespace: "test-ns",
			Labels:    managedLabels(),
		},
		Data: map[string][]byte{
			DefaultPasswordKey: []byte("existing-password"),
		},
	}
	c := fake.NewClientBuilder().
		WithScheme(testScheme()).
		WithObjects(existingDeploy, existingSecret).
		Build()
	ctx := context.Background()

	conn, err := EnsurePostgres(ctx, c, "test-ns", testOpts())
	require.NoError(t, err)
	require.NotNil(t, conn)

	assert.Equal(t, "genai-pgvector.test-ns.svc.cluster.local", conn.Host)
	assert.Equal(t, CredentialsSecretName, conn.PasswordSecret.Name)
}

func TestEnsurePostgres_RollbackOnDeploymentFailure(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()
	ns := "test-ns"

	// Pre-create the Deployment name to cause a conflict on the third create.
	conflicting := &appsv1.Deployment{
		ObjectMeta: metav1.ObjectMeta{
			Name:      DeploymentName,
			Namespace: ns,
		},
	}
	require.NoError(t, c.Create(ctx, conflicting))

	_, err := EnsurePostgres(ctx, c, ns, testOpts())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "Deployment")

	// Secret and PVC should have been rolled back.
	var secrets corev1.SecretList
	require.NoError(t, c.List(ctx, &secrets, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, secrets.Items, "Secret should have been rolled back")

	var pvcs corev1.PersistentVolumeClaimList
	require.NoError(t, c.List(ctx, &pvcs, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, pvcs.Items, "PVC should have been rolled back")
}

func TestDeletePostgresResources(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()
	ns := "test-ns"

	// Provision first.
	_, err := EnsurePostgres(ctx, c, ns, testOpts())
	require.NoError(t, err)

	// Delete.
	require.NoError(t, DeletePostgresResources(ctx, c, ns))

	// Verify all resources are gone.
	var secrets corev1.SecretList
	require.NoError(t, c.List(ctx, &secrets, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, secrets.Items)

	var pvcs corev1.PersistentVolumeClaimList
	require.NoError(t, c.List(ctx, &pvcs, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, pvcs.Items)

	var deploys appsv1.DeploymentList
	require.NoError(t, c.List(ctx, &deploys, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, deploys.Items)

	var svcs corev1.ServiceList
	require.NoError(t, c.List(ctx, &svcs, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, svcs.Items)

	var netpols networkingv1.NetworkPolicyList
	require.NoError(t, c.List(ctx, &netpols, client.InNamespace(ns), client.MatchingLabels(managedLabels())))
	assert.Empty(t, netpols.Items)
}

func TestDeletePostgresResources_NoopWhenNoneExist(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()

	err := DeletePostgresResources(ctx, c, "empty-ns")
	assert.NoError(t, err)
}

func TestEnsurePostgres_DeploymentHasCorrectEnvVars(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()
	ns := "test-ns"

	_, err := EnsurePostgres(ctx, c, ns, testOpts())
	require.NoError(t, err)

	var deploy appsv1.Deployment
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: DeploymentName, Namespace: ns}, &deploy))

	container := deploy.Spec.Template.Spec.Containers[0]
	envMap := make(map[string]corev1.EnvVar)
	for _, e := range container.Env {
		envMap[e.Name] = e
	}

	assert.Equal(t, DefaultDB, envMap[pgDBEnvVar].Value)
	assert.Equal(t, DefaultUser, envMap[pgUserEnvVar].Value)

	pwEnv := envMap[pgPasswordEnvVar]
	require.NotNil(t, pwEnv.ValueFrom)
	require.NotNil(t, pwEnv.ValueFrom.SecretKeyRef)
	assert.Equal(t, CredentialsSecretName, pwEnv.ValueFrom.SecretKeyRef.Name)
	assert.Equal(t, DefaultPasswordKey, pwEnv.ValueFrom.SecretKeyRef.Key)
}

func TestEnsurePostgres_PasswordIsRandom(t *testing.T) {
	c := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	ctx := context.Background()

	_, err := EnsurePostgres(ctx, c, "ns1", testOpts())
	require.NoError(t, err)

	var s1 corev1.Secret
	require.NoError(t, c.Get(ctx, client.ObjectKey{Name: CredentialsSecretName, Namespace: "ns1"}, &s1))

	c2 := fake.NewClientBuilder().WithScheme(testScheme()).Build()
	_, err = EnsurePostgres(ctx, c2, "ns2", testOpts())
	require.NoError(t, err)

	var s2 corev1.Secret
	require.NoError(t, c2.Get(ctx, client.ObjectKey{Name: CredentialsSecretName, Namespace: "ns2"}, &s2))

	assert.NotEqual(t, string(s1.Data[DefaultPasswordKey]), string(s2.Data[DefaultPasswordKey]),
		"passwords should differ between provisioning runs")
}
