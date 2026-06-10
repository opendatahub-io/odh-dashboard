package api

import (
	"context"
	"log/slog"
	"testing"

	"github.com/opendatahub-io/autorag-library/bff/internal/config"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
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

		namespace := "minio-test"

		// TODO: Create a mock DSPA in the test environment with managed MinIO
		// Expected DSPA structure:
		// - metadata.name: "pipelines"
		// - spec.objectStorage.minio.deploy: true
		// - spec.objectStorage.minio.bucket: "mlpipeline"

		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)
		require.NotNil(t, resultCtx, "Context should not be nil")

		// Verify the injected storage config
		storage, ok := resultCtx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
		require.True(t, ok)
		require.NotNil(t, storage)

		assert.Equal(t, "ds-pipeline-s3-pipelines", storage.SecretName)
		assert.Equal(t, "accesskey", storage.AccessKeyField)
		assert.Equal(t, "secretkey", storage.SecretKeyField)
		assert.Equal(t, "http://minio-pipelines.minio-test.svc.cluster.local:9000", storage.EndpointURL)
		assert.Equal(t, "mlpipeline", storage.Bucket)
		assert.Equal(t, "us-east-1", storage.Region)
	})

	t.Run("should inject external storage config when externalStorage is configured", func(t *testing.T) {
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

		namespace := "external-storage-test"

		// TODO: Create a mock DSPA with external storage configuration
		// Expected DSPA structure:
		// - spec.objectStorage.externalStorage.scheme: "https"
		// - spec.objectStorage.externalStorage.host: "s3.amazonaws.com"
		// - spec.objectStorage.externalStorage.bucket: "my-external-bucket"
		// - spec.objectStorage.externalStorage.region: "us-west-2"
		// - spec.objectStorage.externalStorage.s3CredentialsSecret.secretName: "aws-s3-credentials"

		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)
		require.NotNil(t, resultCtx, "Context should not be nil")

		// Verify the injected storage config
		storage, ok := resultCtx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
		require.True(t, ok)
		require.NotNil(t, storage)

		assert.Equal(t, "aws-s3-credentials", storage.SecretName)
		assert.Equal(t, "AWS_ACCESS_KEY_ID", storage.AccessKeyField)
		assert.Equal(t, "AWS_SECRET_ACCESS_KEY", storage.SecretKeyField)
		assert.Equal(t, "https://s3.amazonaws.com", storage.EndpointURL)
		assert.Equal(t, "my-external-bucket", storage.Bucket)
		assert.Equal(t, "us-west-2", storage.Region)
	})

	t.Run("should prefer external storage over managed MinIO when both are configured", func(t *testing.T) {
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

		namespace := "both-storage-test"

		// TODO: Create a mock DSPA with BOTH external storage AND managed MinIO configured
		// The middleware should prefer external storage when both are present
		// Expected DSPA structure:
		// - spec.objectStorage.externalStorage (configured with AWS S3)
		// - spec.objectStorage.minio.deploy: true (also configured)

		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)
		require.NotNil(t, resultCtx, "Context should not be nil")

		// Verify that external storage is injected (not MinIO)
		storage, ok := resultCtx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage)
		require.True(t, ok)
		require.NotNil(t, storage)

		// Verify it's external storage (not MinIO) by checking the secret name and endpoint
		assert.Equal(t, "aws-s3-credentials", storage.SecretName, "Should use external storage secret")
		assert.NotEqual(t, "ds-pipeline-s3-pipelines", storage.SecretName, "Should not use MinIO secret convention")
		assert.Equal(t, "https://s3.amazonaws.com", storage.EndpointURL, "Should use external storage endpoint")
		assert.NotContains(t, storage.EndpointURL, "minio-", "Should not use MinIO endpoint")
		assert.Equal(t, "AWS_ACCESS_KEY_ID", storage.AccessKeyField, "Should use AWS key names, not MinIO lowercase")
		assert.Equal(t, "AWS_SECRET_ACCESS_KEY", storage.SecretKeyField, "Should use AWS key names, not MinIO lowercase")
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

		namespace := "no-dspas-namespace"

		// Call injectDSPAObjectStorageIfAvailable on a namespace with no DSPAs
		resultCtx := app.injectDSPAObjectStorageIfAvailable(ctx, namespace, logger)

		// Verify the returned context is the exact same object as the input context
		assert.Same(t, ctx, resultCtx)

		// Verify no storage config was injected into the context
		assert.Nil(t, resultCtx.Value(constants.DSPAObjectStorageKey))
	})
}

// TestBuildMinIOObjectStorage tests the MinIO object storage builder helper
func TestBuildMinIOObjectStorage(t *testing.T) {
	t.Run("should construct MinIO object storage with correct conventions", func(t *testing.T) {
		result := buildMinIOObjectStorage("my-dspa", "my-namespace", "my-bucket")

		assert.Equal(t, "ds-pipeline-s3-my-dspa", result.SecretName, "Secret name should follow convention")
		assert.Equal(t, "accesskey", result.AccessKeyField, "Should use lowercase accesskey")
		assert.Equal(t, "secretkey", result.SecretKeyField, "Should use lowercase secretkey")
		assert.Equal(t, "http://minio-my-dspa.my-namespace.svc.cluster.local:9000", result.EndpointURL, "Endpoint should follow MinIO URL pattern")
		assert.Equal(t, "my-bucket", result.Bucket)
		assert.Equal(t, "us-east-1", result.Region, "Should default to us-east-1")
	})

	t.Run("should handle different DSPA names", func(t *testing.T) {
		result := buildMinIOObjectStorage("pipelines", "test-ns", "mlpipeline")

		assert.Equal(t, "ds-pipeline-s3-pipelines", result.SecretName)
		assert.Equal(t, "http://minio-pipelines.test-ns.svc.cluster.local:9000", result.EndpointURL)
		assert.Equal(t, "mlpipeline", result.Bucket)
	})

	t.Run("should handle empty bucket", func(t *testing.T) {
		result := buildMinIOObjectStorage("test-dspa", "test-ns", "")

		assert.Equal(t, "", result.Bucket, "Should preserve empty bucket")
		assert.Equal(t, "ds-pipeline-s3-test-dspa", result.SecretName, "Secret name should still be constructed")
	})
}
