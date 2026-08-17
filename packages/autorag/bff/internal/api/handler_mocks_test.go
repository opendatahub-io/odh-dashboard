package api

import (
	"context"
	"io"

	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	"github.com/stretchr/testify/mock"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// --- Mock K8s Service (implements kubernetes.Service) ---

type mockK8sService struct {
	mock.Mock
}

func (m *mockK8sService) GetUserInfo(ctx context.Context) (*kubernetes.UserInfo, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*kubernetes.UserInfo), args.Error(1)
}

func (m *mockK8sService) GetAccessibleNamespaceInfos(ctx context.Context) ([]kubernetes.NamespaceInfo, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]kubernetes.NamespaceInfo), args.Error(1)
}

func (m *mockK8sService) GetSecretInfos(ctx context.Context, namespace string) ([]kubernetes.SecretInfo, error) {
	args := m.Called(ctx, namespace)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]kubernetes.SecretInfo), args.Error(1)
}

func (m *mockK8sService) CanAccessResource(ctx context.Context, namespace, verb, group, resource, name string) (bool, error) {
	args := m.Called(ctx, namespace, verb, group, resource, name)
	return args.Bool(0), args.Error(1)
}

// Unused Service methods — satisfy the interface with zero-value returns.
func (m *mockK8sService) GetNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sService) GetNamespaceInfos(ctx context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetAccessibleNamespaces(ctx context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sService) GetPods(ctx context.Context, namespace string) (*v1.PodList, error) {
	return nil, nil
}
func (m *mockK8sService) GetSecrets(ctx context.Context, namespace string) ([]v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sService) GetSecret(ctx context.Context, namespace, name string) (*v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sService) GetUser(ctx context.Context) (string, error) { return "", nil }
func (m *mockK8sService) IsClusterAdmin(ctx context.Context) (bool, error) {
	return false, nil
}
func (m *mockK8sService) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	return nil, nil
}
func (m *mockK8sService) GetResource(ctx context.Context, gvr schema.GroupVersionResource, namespace, name string) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) CreateResource(ctx context.Context, gvr schema.GroupVersionResource, namespace string, obj *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) PatchResource(_ context.Context, _ schema.GroupVersionResource, _, _ string, _ types.PatchType, _ []byte) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) PatchDeployment(_ context.Context, _, _ string, _ types.PatchType, _ []byte) error {
	return nil
}
func (m *mockK8sService) DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
	return schema.GroupVersionResource{}, nil
}

// compile-time check
var _ kubernetes.Service = (*mockK8sService)(nil)

// --- Mock Healthcheck Repository ---

type mockHealthcheckRepo struct {
	mock.Mock
}

func (m *mockHealthcheckRepo) HealthCheck(version string) (models.HealthCheckModel, error) {
	args := m.Called(version)
	return args.Get(0).(models.HealthCheckModel), args.Error(1)
}

// --- Mock K8s Repository ---

type mockK8sRepo struct {
	mock.Mock
}

func (m *mockK8sRepo) GetFilteredSecrets(k8sService kubernetes.Service, ctx context.Context, namespace string, secretType string) ([]models.SecretListItem, error) {
	args := m.Called(k8sService, ctx, namespace, secretType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]models.SecretListItem), args.Error(1)
}

func (m *mockK8sRepo) GetSecretCredentials(k8sService kubernetes.Service, ctx context.Context, namespace, name string) (map[string]string, error) {
	args := m.Called(k8sService, ctx, namespace, name)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(map[string]string), args.Error(1)
}

// --- Mock S3 Repository ---

type mockS3Repo struct {
	mock.Mock
}

func (m *mockS3Repo) GetObject(ctx context.Context, req repositories.S3RequestContext, key string) (*repositories.GetObjectResult, error) {
	args := m.Called(ctx, req, key)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repositories.GetObjectResult), args.Error(1)
}

func (m *mockS3Repo) UploadFile(ctx context.Context, req repositories.S3RequestContext, key string, body io.Reader, rawContentType string, maxAttempts int) (string, error) {
	args := m.Called(ctx, req, key, body, rawContentType, maxAttempts)
	return args.String(0), args.Error(1)
}

func (m *mockS3Repo) ListObjects(ctx context.Context, req repositories.S3RequestContext, options s3.ListObjectsOptions) (*s3.ListObjectsResponse, error) {
	args := m.Called(ctx, req, options)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*s3.ListObjectsResponse), args.Error(1)
}

// --- Mock Pipelines Repository ---

type mockPipelinesRepo struct {
	mock.Mock
}

func (m *mockPipelinesRepo) GetCombinedRuns(ctx context.Context, namespace string, pageSize int32, page int64) (*models.PipelineRunsData, error) {
	args := m.Called(ctx, namespace, pageSize, page)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PipelineRunsData), args.Error(1)
}

func (m *mockPipelinesRepo) GetManagedRun(ctx context.Context, namespace, runID string) (*models.PipelineRun, error) {
	args := m.Called(ctx, namespace, runID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PipelineRun), args.Error(1)
}

func (m *mockPipelinesRepo) CreateRun(ctx context.Context, namespace string, req models.CreateAutoRAGRunRequest) (*models.PipelineRun, error) {
	args := m.Called(ctx, namespace, req)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.PipelineRun), args.Error(1)
}

func (m *mockPipelinesRepo) TerminateRun(ctx context.Context, namespace, runID string) error {
	args := m.Called(ctx, namespace, runID)
	return args.Error(0)
}

func (m *mockPipelinesRepo) RetryRun(ctx context.Context, namespace, runID string) error {
	args := m.Called(ctx, namespace, runID)
	return args.Error(0)
}

func (m *mockPipelinesRepo) DeleteRun(ctx context.Context, namespace, runID string) error {
	args := m.Called(ctx, namespace, runID)
	return args.Error(0)
}

func (m *mockPipelinesRepo) EnableManagedPipelines(ctx context.Context, namespace string) (*pipelines.EnableManagedPipelinesResult, error) {
	args := m.Called(ctx, namespace)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*pipelines.EnableManagedPipelinesResult), args.Error(1)
}

// --- Mock OGX Repository ---

type mockOGXRepo struct {
	mock.Mock
}

func (m *mockOGXRepo) GetOGXModels(ctx context.Context, namespace, secretName string) (*models.OGXModelsData, error) {
	args := m.Called(ctx, namespace, secretName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.OGXModelsData), args.Error(1)
}

func (m *mockOGXRepo) GetOGXVectorStoreProviders(ctx context.Context, namespace, secretName string) (*models.OGXVectorStoreProvidersData, error) {
	args := m.Called(ctx, namespace, secretName)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*models.OGXVectorStoreProvidersData), args.Error(1)
}
