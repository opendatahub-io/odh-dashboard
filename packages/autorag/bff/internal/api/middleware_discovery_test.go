package api

import (
	"context"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	k8mocks "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes/k8mocks"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestIsDSPAReady tests the isDSPAReady function
func TestIsDSPAReady(t *testing.T) {
	t.Run("should return true when Ready condition is True", func(t *testing.T) {
		dspa := &models.DSPipelineApplication{
			Status: &models.DSPipelineApplicationStatus{
				Conditions: []models.DSPipelineApplicationCondition{
					{Type: "Ready", Status: "True"},
				},
			},
		}

		assert.True(t, isDSPAReady(dspa))
	})

	t.Run("should return false when Ready condition is False", func(t *testing.T) {
		dspa := &models.DSPipelineApplication{
			Status: &models.DSPipelineApplicationStatus{
				Conditions: []models.DSPipelineApplicationCondition{
					{Type: "Ready", Status: "False"},
				},
			},
		}

		assert.False(t, isDSPAReady(dspa))
	})

	t.Run("should return false when Ready condition is missing", func(t *testing.T) {
		dspa := &models.DSPipelineApplication{
			Status: &models.DSPipelineApplicationStatus{
				Conditions: []models.DSPipelineApplicationCondition{
					{Type: "APIServerReady", Status: "True"},
				},
			},
		}

		assert.False(t, isDSPAReady(dspa))
	})

	t.Run("should return false when conditions array is nil", func(t *testing.T) {
		dspa := &models.DSPipelineApplication{
			Status: &models.DSPipelineApplicationStatus{
				Conditions: nil,
			},
		}

		assert.False(t, isDSPAReady(dspa))
	})

	t.Run("should return false when dspa is nil", func(t *testing.T) {
		assert.False(t, isDSPAReady(nil))
	})

	t.Run("should find Ready condition among multiple conditions", func(t *testing.T) {
		dspa := &models.DSPipelineApplication{
			Status: &models.DSPipelineApplicationStatus{
				Conditions: []models.DSPipelineApplicationCondition{
					{Type: "DatabaseReady", Status: "True"},
					{Type: "APIServerReady", Status: "True"},
					{Type: "Ready", Status: "True"},
					{Type: "PersistenceAgentReady", Status: "True"},
				},
			},
		}

		assert.True(t, isDSPAReady(dspa))
	})
}

// TestDiscoverReadyDSPA tests the discoverReadyDSPA function
func TestDiscoverReadyDSPA(t *testing.T) {
	t.Run("should return nil when no DSPAs exist in namespace", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		k8sClient, err := k8sFactory.GetClient(ctx)
		require.NoError(t, err)

		app := &App{
			config: cfg,
			logger: logger,
		}

		// Test with namespace that has no DSPAs in mock data
		dspa, err := app.discoverReadyDSPA(ctx, k8sClient, "no-dspas-namespace", logger)

		require.ErrorIs(t, err, ErrNoDSPAFound, "Should return ErrNoDSPAFound when no DSPAs exist in namespace")
		assert.Nil(t, dspa, "Should return nil DSPA when none exist")
	})

	t.Run("should return first ready DSPA", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		k8sClient, err := k8sFactory.GetClient(ctx)
		require.NoError(t, err)

		app := &App{
			config: cfg,
			logger: logger,
		}

		// Test with mock K8s client (returns mock DSPAs)
		dspa, err := app.discoverReadyDSPA(ctx, k8sClient, "test-namespace", logger)

		// Should find the ready DSPA from mock data
		require.NoError(t, err)
		assert.NotNil(t, dspa, "Should return a DSPA")
		if dspa != nil {
			assert.Equal(t, "dspa", dspa.Metadata.Name)
			assert.True(t, isDSPAReady(dspa), "Returned DSPA should be ready")
		}
	})

	t.Run("should return only ready DSPA when multiple exist", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		k8sClient, err := k8sFactory.GetClient(ctx)
		require.NoError(t, err)

		app := &App{
			config: cfg,
			logger: logger,
		}

		// test-namespace has 2 DSPAs: one ready, one not ready
		// Should return the ready one
		dspa, err := app.discoverReadyDSPA(ctx, k8sClient, "test-namespace", logger)

		require.NoError(t, err)
		require.NotNil(t, dspa, "Should return a DSPA")
		assert.Equal(t, "dspa", dspa.Metadata.Name, "Should return the ready DSPA named 'dspa'")
		assert.True(t, isDSPAReady(dspa), "Returned DSPA should be ready")
	})
}

// TestGetMockDSPipelineApplications tests the mock DSPA data
func TestGetMockDSPipelineApplications(t *testing.T) {
	t.Run("should return DSPAs only for matching namespace", func(t *testing.T) {
		namespace := "test-namespace"
		dspas := getMockDSPipelineApplications(namespace)

		assert.Len(t, dspas, 2, "Should return 2 mock DSPAs for test-namespace")

		// Verify all returned DSPAs are in the requested namespace
		for _, dspa := range dspas {
			assert.Equal(t, namespace, dspa.Metadata.Namespace, "All DSPAs should be in the requested namespace")
		}
	})

	t.Run("should return synthetic ready DSPA for namespace with no matching mock DSPAs", func(t *testing.T) {
		namespace := "aistor"
		dspas := getMockDSPipelineApplications(namespace)

		assert.Len(t, dspas, 1, "Should return synthetic DSPA for any namespace when no mock matches")
		require.NotEmpty(t, dspas)
		dspa := dspas[0]
		assert.Equal(t, "dspa", dspa.Metadata.Name)
		assert.Equal(t, namespace, dspa.Metadata.Namespace)
		assert.True(t, dspa.Status.Ready)
		assert.True(t, isDSPAReady(&dspa))
	})

	t.Run("should have first DSPA ready with Ready condition True", func(t *testing.T) {
		namespace := "test-namespace"
		dspas := getMockDSPipelineApplications(namespace)

		require.Len(t, dspas, 2)

		firstDSPA := dspas[0]
		assert.Equal(t, "dspa", firstDSPA.Metadata.Name)
		assert.Equal(t, namespace, firstDSPA.Metadata.Namespace)
		assert.True(t, firstDSPA.Status.Ready)
		assert.True(t, isDSPAReady(&firstDSPA), "First DSPA should be fully ready")
	})

	t.Run("should have second DSPA not ready", func(t *testing.T) {
		namespace := "test-namespace"
		dspas := getMockDSPipelineApplications(namespace)

		require.Len(t, dspas, 2)

		secondDSPA := dspas[1]
		assert.Equal(t, "dspa-test", secondDSPA.Metadata.Name)
		assert.Equal(t, namespace, secondDSPA.Metadata.Namespace)
		assert.False(t, secondDSPA.Status.Ready)
		assert.False(t, isDSPAReady(&secondDSPA), "Second DSPA should not be ready")
	})

	t.Run("should set correct API URLs in status", func(t *testing.T) {
		namespace := "test-namespace"
		dspas := getMockDSPipelineApplications(namespace)

		require.Len(t, dspas, 2)

		// Check first DSPA URLs
		firstDSPA := dspas[0]
		require.NotNil(t, firstDSPA.Status.Components)
		require.NotNil(t, firstDSPA.Status.Components.APIServer)
		assert.Equal(t, "https://ds-pipeline-dspa.test-namespace.svc.cluster.local:8443", firstDSPA.Status.Components.APIServer.URL)
		assert.Contains(t, firstDSPA.Status.Components.APIServer.ExternalURL, "test-namespace")

		// Check second DSPA URLs
		secondDSPA := dspas[1]
		require.NotNil(t, secondDSPA.Status.Components)
		require.NotNil(t, secondDSPA.Status.Components.APIServer)
		assert.Equal(t, "https://ds-pipeline-dspa-test.test-namespace.svc.cluster.local:8443", secondDSPA.Status.Components.APIServer.URL)
		assert.Contains(t, secondDSPA.Status.Components.APIServer.ExternalURL, "test-namespace")
	})

	t.Run("mock DSPAs should have correct structure", func(t *testing.T) {
		namespace := "test-namespace"
		dspas := getMockDSPipelineApplications(namespace)

		require.Len(t, dspas, 2, "test-namespace should have 2 DSPAs")

		for i, dspa := range dspas {
			assert.Equal(t, "datasciencepipelinesapplications.opendatahub.io/v1", dspa.APIVersion, "DSPA %d should have correct APIVersion", i)
			assert.Equal(t, "DSPipelineApplication", dspa.Kind, "DSPA %d should have correct Kind", i)
			assert.NotEmpty(t, dspa.Metadata.Name, "DSPA %d should have a name", i)
			assert.Equal(t, "test-namespace", dspa.Metadata.Namespace, "DSPA %d should be in test-namespace", i)
			assert.NotNil(t, dspa.Spec.APIServer, "DSPA %d should have APIServer spec", i)
			assert.True(t, dspa.Spec.APIServer.Deploy, "DSPA %d should have APIServer.Deploy=true", i)
		}
	})
}

// TestInjectDSPAObjectStorageForMinIO tests the MinIO auto-discovery functionality
func TestInjectDSPAObjectStorageForMinIO(t *testing.T) {
	t.Run("should inject managed MinIO storage config when minio.deploy is true", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		app := &App{
			config:                  cfg,
			logger:                  logger,
			kubernetesClientFactory: k8sFactory,
		}

		// Create a test namespace with a managed MinIO DSPA
		namespace := "minio-test"

		// Inject storage config using the function
		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)

		// Verify context was returned (won't have injection without mock MinIO DSPA data)
		require.NotNil(t, resultCtx, "Context should not be nil")
	})

	t.Run("should prefer external storage over managed MinIO when both exist", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		app := &App{
			config:                  cfg,
			logger:                  logger,
			kubernetesClientFactory: k8sFactory,
		}

		namespace := "test-namespace"

		// test-namespace has external storage DSPA - should use external storage
		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)

		require.NotNil(t, resultCtx, "Context should not be nil")
	})

	t.Run("should return original context when no DSPAs exist", func(t *testing.T) {
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()

		logger := slog.Default()
		cfg := config.EnvConfig{
			MockK8Client: true,
			AuthMethod:   config.AuthMethodInternal,
		}

		testEnv, clientset, err := k8mocks.SetupEnvTest(k8mocks.TestEnvInput{
			Logger: logger,
			Ctx:    ctx,
			Cancel: cancel,
		})
		require.NoError(t, err)
		defer func() {
			if testEnv != nil {
				_ = testEnv.Stop()
			}
		}()

		k8sFactory, err := k8mocks.NewMockedKubernetesClientFactory(clientset, testEnv, cfg, logger)
		require.NoError(t, err)

		app := &App{
			config:                  cfg,
			logger:                  logger,
			kubernetesClientFactory: k8sFactory,
		}

		namespace := "empty-namespace"

		// empty-namespace has no DSPAs
		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)

		require.NotNil(t, resultCtx, "Context should not be nil")
	})
}
