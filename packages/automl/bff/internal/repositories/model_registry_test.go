package repositories

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"testing"

	"github.com/kubeflow/model-registry/pkg/openapi"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	v1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

// --- Mocks ---

type mockModelRegistryClient struct {
	createRegisteredModelFn func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error)
	createModelVersionFn    func(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error)
	createModelArtifactFn   func(ctx context.Context, baseURL, versionID string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error)
}

func (m *mockModelRegistryClient) CreateRegisteredModel(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
	return m.createRegisteredModelFn(ctx, baseURL, body)
}
func (m *mockModelRegistryClient) CreateModelVersion(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
	return m.createModelVersionFn(ctx, baseURL, modelID, body)
}
func (m *mockModelRegistryClient) CreateModelArtifact(ctx context.Context, baseURL, versionID string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error) {
	return m.createModelArtifactFn(ctx, baseURL, versionID, body)
}

type mockK8sServiceForMR struct {
	listResourcesFn func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
}

func (m *mockK8sServiceForMR) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	return m.listResourcesFn(ctx, gvr, namespace)
}

// Unused — stub to satisfy kubernetes.Service
func (m *mockK8sServiceForMR) GetNamespaces(context.Context) ([]v1.Namespace, error) { return nil, nil }
func (m *mockK8sServiceForMR) GetNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetAccessibleNamespaces(context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetAccessibleNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetPods(context.Context, string) (*v1.PodList, error) { return nil, nil }
func (m *mockK8sServiceForMR) GetSecrets(context.Context, string) ([]v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetSecretInfos(context.Context, string) ([]kubernetes.SecretInfo, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetSecret(context.Context, string, string) (*v1.Secret, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) GetUser(context.Context) (string, error)      { return "", nil }
func (m *mockK8sServiceForMR) IsClusterAdmin(context.Context) (bool, error) { return false, nil }
func (m *mockK8sServiceForMR) GetUserInfo(context.Context) (*kubernetes.UserInfo, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) CanAccessResource(context.Context, string, string, string, string, string) (bool, error) {
	return false, nil
}
func (m *mockK8sServiceForMR) GetResource(context.Context, schema.GroupVersionResource, string, string) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) CreateResource(context.Context, schema.GroupVersionResource, string, *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sServiceForMR) DiscoverResourceGVR(context.Context, string, string, string, []string) (schema.GroupVersionResource, error) {
	return schema.GroupVersionResource{}, nil
}

// --- Helpers ---

func makeRegistryCR(name, uid string, ready bool, hosts []string, annotations map[string]string) unstructured.Unstructured {
	conditions := []any{}
	if ready {
		conditions = append(conditions, map[string]any{"type": "Available", "status": "True"})
	} else {
		conditions = append(conditions, map[string]any{"type": "Available", "status": "False"})
	}

	hostsAny := make([]any, len(hosts))
	for i, h := range hosts {
		hostsAny[i] = h
	}

	obj := map[string]any{
		"apiVersion": "modelregistry.opendatahub.io/v1beta1",
		"kind":       "ModelRegistry",
		"metadata": map[string]any{
			"name":        name,
			"namespace":   "rhoai-model-registries",
			"uid":         uid,
			"annotations": toAnyMap(annotations),
		},
		"status": map[string]any{
			"conditions": conditions,
			"hosts":      hostsAny,
		},
	}
	return unstructured.Unstructured{Object: obj}
}

func toAnyMap(m map[string]string) map[string]any {
	if m == nil {
		return map[string]any{}
	}
	r := make(map[string]any, len(m))
	for k, v := range m {
		r[k] = v
	}
	return r
}

func registryList(items ...unstructured.Unstructured) *unstructured.UnstructuredList {
	return &unstructured.UnstructuredList{Items: items}
}

// === Pure Functions ===

func TestBuildModelRegistryURI(t *testing.T) {
	t.Run("standard URI", func(t *testing.T) {
		uri := buildModelRegistryURI("my-bucket", "pipeline/run/model.tar.gz", "https://s3.example.com", "us-west-2")
		if !strings.HasPrefix(uri, "s3://my-bucket/pipeline/run/model.tar.gz?") {
			t.Errorf("prefix: %q", uri)
		}
		if !strings.Contains(uri, "endpoint=https") {
			t.Errorf("missing endpoint: %q", uri)
		}
		if !strings.Contains(uri, "defaultRegion=us-west-2") {
			t.Errorf("missing region: %q", uri)
		}
	})

	t.Run("strips leading slashes from key", func(t *testing.T) {
		uri := buildModelRegistryURI("b", "///key", "https://s3.example.com", "")
		if !strings.HasPrefix(uri, "s3://b/key?") {
			t.Errorf("should strip leading slashes: %q", uri)
		}
	})

	t.Run("empty region omits param", func(t *testing.T) {
		uri := buildModelRegistryURI("b", "k", "https://s3.example.com", "")
		if strings.Contains(uri, "defaultRegion") {
			t.Errorf("should omit defaultRegion when empty: %q", uri)
		}
	})
}

func TestBuildRegistryURLs(t *testing.T) {
	logger := slog.Default()

	t.Run("picks internal FQDN and external route", func(t *testing.T) {
		hosts := []string{
			"my-reg-rest.apps.cluster.example.com",
			"my-reg.rhoai-model-registries.svc.cluster.local",
			"my-reg.rhoai-model-registries",
			"my-reg",
		}
		server, external := buildRegistryURLs("my-reg", hosts, logger)
		if !strings.Contains(server, "svc.cluster.local") {
			t.Errorf("serverURL should use FQDN: %q", server)
		}
		if !strings.Contains(server, ":8443") {
			t.Errorf("serverURL should include port: %q", server)
		}
		if !strings.Contains(external, "apps.cluster.example.com") {
			t.Errorf("externalURL should use route: %q", external)
		}
		if strings.Contains(external, ":8443") {
			t.Errorf("externalURL should NOT include port: %q", external)
		}
	})

	t.Run("no external route", func(t *testing.T) {
		hosts := []string{
			"my-reg.rhoai-model-registries.svc.cluster.local",
			"my-reg.rhoai-model-registries",
			"my-reg",
		}
		server, external := buildRegistryURLs("my-reg", hosts, logger)
		if !strings.Contains(server, "svc.cluster.local") {
			t.Errorf("serverURL: %q", server)
		}
		if external != "" {
			t.Errorf("externalURL should be empty: %q", external)
		}
	})

	t.Run("empty hosts falls back to constructed URL", func(t *testing.T) {
		server, external := buildRegistryURLs("my-reg", nil, logger)
		if !strings.Contains(server, "my-reg.rhoai-model-registries") {
			t.Errorf("fallback serverURL should construct from name: %q", server)
		}
		if external != "" {
			t.Errorf("externalURL should be empty: %q", external)
		}
	})

	t.Run("includes REST API path", func(t *testing.T) {
		hosts := []string{"my-reg.rhoai-model-registries.svc.cluster.local"}
		server, _ := buildRegistryURLs("my-reg", hosts, logger)
		if !strings.Contains(server, "/api/model_registry/") {
			t.Errorf("should include REST API path: %q", server)
		}
	})
}

// === ListModelRegistries ===

func TestListModelRegistries(t *testing.T) {
	t.Run("returns registries with correct fields", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg-1", "uid-1", true,
						[]string{"reg-1.rhoai-model-registries.svc.cluster.local"},
						map[string]string{
							"openshift.io/display-name": "My Registry",
							"openshift.io/description":  "Production",
						}),
					makeRegistryCR("reg-2", "uid-2", false,
						[]string{"reg-2.rhoai-model-registries.svc.cluster.local"},
						nil),
				), nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		data, err := repo.ListModelRegistries(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(data.ModelRegistries) != 2 {
			t.Fatalf("expected 2, got %d", len(data.ModelRegistries))
		}

		r1 := data.ModelRegistries[0]
		if r1.ID != "uid-1" || r1.Name != "reg-1" || r1.DisplayName != "My Registry" || r1.Description != "Production" {
			t.Errorf("r1: %+v", r1)
		}
		if !r1.IsReady {
			t.Error("r1 should be ready")
		}

		r2 := data.ModelRegistries[1]
		if r2.DisplayName != "reg-2" {
			t.Errorf("display name should fall back to name: %q", r2.DisplayName)
		}
		if r2.IsReady {
			t.Error("r2 should not be ready")
		}
	})

	t.Run("CRD not installed returns empty", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return nil, kubernetes.ErrNotFound
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		data, err := repo.ListModelRegistries(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(data.ModelRegistries) != 0 {
			t.Errorf("expected empty, got %d", len(data.ModelRegistries))
		}
	})

	t.Run("forbidden returns ErrModelRegistryForbidden", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return nil, kubernetes.ErrForbidden
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		_, err := repo.ListModelRegistries(context.Background())
		if !errors.Is(err, ErrModelRegistryForbidden) {
			t.Errorf("expected ErrModelRegistryForbidden, got %v", err)
		}
	})

	t.Run("other error propagated", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return nil, fmt.Errorf("timeout")
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		_, err := repo.ListModelRegistries(context.Background())
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty list", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(), nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		data, err := repo.ListModelRegistries(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if len(data.ModelRegistries) != 0 {
			t.Errorf("expected 0, got %d", len(data.ModelRegistries))
		}
	})
}

// === ResolveModelRegistryByUID ===

func TestResolveModelRegistryByUID(t *testing.T) {
	k8s := &mockK8sServiceForMR{
		listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
			return registryList(
				makeRegistryCR("reg-ready", "uid-ready", true,
					[]string{"reg-ready.rhoai-model-registries.svc.cluster.local"}, nil),
				makeRegistryCR("reg-not-ready", "uid-not-ready", false,
					[]string{"reg-not-ready.rhoai-model-registries.svc.cluster.local"}, nil),
			), nil
		},
	}
	repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

	t.Run("found and ready", func(t *testing.T) {
		reg, err := repo.ResolveModelRegistryByUID(context.Background(), "uid-ready")
		if err != nil {
			t.Fatal(err)
		}
		if reg.Name != "reg-ready" {
			t.Errorf("Name = %q", reg.Name)
		}
	})

	t.Run("found but not ready", func(t *testing.T) {
		_, err := repo.ResolveModelRegistryByUID(context.Background(), "uid-not-ready")
		if !errors.Is(err, ErrModelRegistryNotReady) {
			t.Errorf("expected ErrModelRegistryNotReady, got %v", err)
		}
	})

	t.Run("not found", func(t *testing.T) {
		_, err := repo.ResolveModelRegistryByUID(context.Background(), "uid-missing")
		if !errors.Is(err, ErrModelRegistryNotFound) {
			t.Errorf("expected ErrModelRegistryNotFound, got %v", err)
		}
	})

	t.Run("trims whitespace from UID", func(t *testing.T) {
		reg, err := repo.ResolveModelRegistryByUID(context.Background(), "  uid-ready  ")
		if err != nil {
			t.Fatal(err)
		}
		if reg.Name != "reg-ready" {
			t.Error("should trim UID whitespace")
		}
	})
}

// === RegisterModel ===

func TestRegisterModel(t *testing.T) {
	dspaSpec := &pipelines.DSPAObjectStorageSpec{
		SecretName:     "dspa-secret",
		AccessKeyField: "ak",
		SecretKeyField: "sk",
		EndpointURL:    "https://minio.ns.svc:9000",
		Bucket:         "pipeline-bucket",
		Region:         "us-west-2",
	}

	validReq := models.RegisterModelRequest{
		S3Path:       "pipeline/run/model.tar.gz",
		ModelName:    "my-model",
		VersionName:  "v1",
		ArtifactName: "artifact-1",
	}

	t.Run("success creates all three resources", func(t *testing.T) {
		regModelID := "rm-1"
		versionID := "mv-1"

		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec}, nil
			},
		}
		mrClient := &mockModelRegistryClient{
			createRegisteredModelFn: func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
				if body.Name != "my-model" {
					t.Errorf("model name = %q", body.Name)
				}
				return &openapi.RegisteredModel{Id: &regModelID, Name: "my-model"}, nil
			},
			createModelVersionFn: func(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
				if modelID != regModelID {
					t.Errorf("modelID = %q", modelID)
				}
				if body.Name != "v1" {
					t.Errorf("version name = %q", body.Name)
				}
				return &openapi.ModelVersion{Id: &versionID, Name: "v1"}, nil
			},
			createModelArtifactFn: func(ctx context.Context, baseURL, vid string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error) {
				if vid != versionID {
					t.Errorf("versionID = %q", vid)
				}
				if body.Uri == nil || !strings.HasPrefix(*body.Uri, "s3://pipeline-bucket/") {
					t.Errorf("URI = %v", body.Uri)
				}
				if body.Name == nil || *body.Name != "artifact-1" {
					t.Errorf("artifact name = %v", body.Name)
				}
				artifactID := "ma-1"
				return &openapi.ModelArtifact{Id: &artifactID}, nil
			},
		}

		repo := NewModelRegistryRepository(slog.Default(), mrClient, k8s, pip)

		gotRegModelID, artifact, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err != nil {
			t.Fatal(err)
		}
		if gotRegModelID != regModelID {
			t.Errorf("regModelID = %q", gotRegModelID)
		}
		if artifact == nil {
			t.Error("expected artifact")
		}
	})

	t.Run("artifact name defaults to version name", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec}, nil
			},
		}
		var gotArtifactName string
		rmID := "rm-1"
		vID := "mv-1"
		mrClient := &mockModelRegistryClient{
			createRegisteredModelFn: func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
				return &openapi.RegisteredModel{Id: &rmID}, nil
			},
			createModelVersionFn: func(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
				return &openapi.ModelVersion{Id: &vID}, nil
			},
			createModelArtifactFn: func(ctx context.Context, baseURL, vid string, body openapi.ModelArtifactCreate) (*openapi.ModelArtifact, error) {
				gotArtifactName = *body.Name
				aID := "ma-1"
				return &openapi.ModelArtifact{Id: &aID}, nil
			},
		}

		repo := NewModelRegistryRepository(slog.Default(), mrClient, k8s, pip)
		req := validReq
		req.ArtifactName = "" // should default to version name
		_, _, err := repo.RegisterModel(context.Background(), "uid-1", req, "ns")
		if err != nil {
			t.Fatal(err)
		}
		if gotArtifactName != "v1" {
			t.Errorf("artifact name should default to version name, got %q", gotArtifactName)
		}
	})

	t.Run("registry not found", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(), nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		_, _, err := repo.RegisterModel(context.Background(), "missing", validReq, "ns")
		if !errors.Is(err, ErrModelRegistryNotFound) {
			t.Errorf("expected ErrModelRegistryNotFound, got %v", err)
		}
	})

	t.Run("registry not ready", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", false,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, nil)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if !errors.Is(err, ErrModelRegistryNotReady) {
			t.Errorf("expected ErrModelRegistryNotReady, got %v", err)
		}
	})

	t.Run("DSPA discovery failure", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return nil, fmt.Errorf("no ready DSPA")
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, pip)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err == nil || !strings.Contains(err.Error(), "DSPA") {
			t.Errorf("expected DSPA error, got %v", err)
		}
	})

	t.Run("nil DSPA object storage", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns"}, nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), nil, k8s, pip)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err == nil || !strings.Contains(err.Error(), "no object storage") {
			t.Errorf("expected object storage error, got %v", err)
		}
	})

	t.Run("create registered model failure", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec}, nil
			},
		}
		mrClient := &mockModelRegistryClient{
			createRegisteredModelFn: func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
				return nil, fmt.Errorf("conflict")
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), mrClient, k8s, pip)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("create model version failure", func(t *testing.T) {
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec}, nil
			},
		}
		rmID := "rm-1"
		mrClient := &mockModelRegistryClient{
			createRegisteredModelFn: func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
				return &openapi.RegisteredModel{Id: &rmID}, nil
			},
			createModelVersionFn: func(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
				return nil, fmt.Errorf("version conflict")
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), mrClient, k8s, pip)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("DSPA missing bucket", func(t *testing.T) {
		noBucketSpec := *dspaSpec
		noBucketSpec.Bucket = ""
		k8s := &mockK8sServiceForMR{
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return registryList(
					makeRegistryCR("reg", "uid-1", true,
						[]string{"reg.rhoai-model-registries.svc.cluster.local"}, nil),
				), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: &noBucketSpec}, nil
			},
		}
		rmID := "rm-1"
		vID := "mv-1"
		mrClient := &mockModelRegistryClient{
			createRegisteredModelFn: func(ctx context.Context, baseURL string, body openapi.RegisteredModelCreate) (*openapi.RegisteredModel, error) {
				return &openapi.RegisteredModel{Id: &rmID}, nil
			},
			createModelVersionFn: func(ctx context.Context, baseURL, modelID string, body openapi.ModelVersionCreate) (*openapi.ModelVersion, error) {
				return &openapi.ModelVersion{Id: &vID}, nil
			},
		}
		repo := NewModelRegistryRepository(slog.Default(), mrClient, k8s, pip)

		_, _, err := repo.RegisterModel(context.Background(), "uid-1", validReq, "ns")
		if err == nil || !strings.Contains(err.Error(), "bucket") {
			t.Errorf("expected bucket error, got %v", err)
		}
	})
}

// === ValidateRegisterModelRequest ===

func TestValidateRegisterModelRequest(t *testing.T) {
	valid := models.RegisterModelRequest{
		S3Path:      "pipeline/run/models/predictor",
		ModelName:   "my-model",
		VersionName: "v1",
	}

	t.Run("valid request", func(t *testing.T) {
		if err := ValidateRegisterModelRequest(valid); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("valid deep relative path", func(t *testing.T) {
		req := valid
		req.S3Path = "autogluon-training/run-123/models/model-1/predictor"
		if err := ValidateRegisterModelRequest(req); err != nil {
			t.Fatal(err)
		}
	})

	t.Run("empty s3_path", func(t *testing.T) {
		req := valid
		req.S3Path = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "s3_path") {
			t.Errorf("expected s3_path error, got %v", err)
		}
	})

	t.Run("whitespace-only s3_path", func(t *testing.T) {
		req := valid
		req.S3Path = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("rejects URI schemes", func(t *testing.T) {
		for _, path := range []string{"s3://bucket/key", "https://example.com/model", "s3a://bucket/key"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil || !strings.Contains(err.Error(), "relative") {
				t.Errorf("path %q: expected relative error, got %v", path, err)
			}
		}
	})

	t.Run("rejects path traversal", func(t *testing.T) {
		for _, path := range []string{"/absolute/path", "./relative", "../parent", "a/../../escape"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil {
				t.Errorf("path %q should be rejected", path)
			}
		}
	})

	t.Run("rejects query/fragment/host delimiters", func(t *testing.T) {
		for _, path := range []string{"path?query=1", "path#fragment", "user@host/path"} {
			req := valid
			req.S3Path = path
			err := ValidateRegisterModelRequest(req)
			if err == nil {
				t.Errorf("path %q should be rejected", path)
			}
		}
	})

	t.Run("empty model_name", func(t *testing.T) {
		req := valid
		req.ModelName = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "model_name") {
			t.Errorf("expected model_name error, got %v", err)
		}
	})

	t.Run("whitespace-only model_name", func(t *testing.T) {
		req := valid
		req.ModelName = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("empty version_name", func(t *testing.T) {
		req := valid
		req.VersionName = ""
		err := ValidateRegisterModelRequest(req)
		if err == nil || !strings.Contains(err.Error(), "version_name") {
			t.Errorf("expected version_name error, got %v", err)
		}
	})

	t.Run("whitespace-only version_name", func(t *testing.T) {
		req := valid
		req.VersionName = "   "
		err := ValidateRegisterModelRequest(req)
		if err == nil {
			t.Error("expected error")
		}
	})
}
