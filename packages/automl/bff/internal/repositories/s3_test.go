package repositories

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"testing"

	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
	v1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/types"
)

// --- Mocks ---

type mockK8sService struct {
	getSecretFn func(ctx context.Context, namespace, secretName string) (*v1.Secret, error)
}

func (m *mockK8sService) GetSecret(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
	return m.getSecretFn(ctx, namespace, secretName)
}

// Unused — stub to satisfy kubernetes.Service
func (m *mockK8sService) GetNamespaces(context.Context) ([]v1.Namespace, error) { return nil, nil }
func (m *mockK8sService) GetNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetAccessibleNamespaces(context.Context) ([]v1.Namespace, error) {
	return nil, nil
}
func (m *mockK8sService) GetAccessibleNamespaceInfos(context.Context) ([]kubernetes.NamespaceInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetPods(context.Context, string) (*v1.PodList, error)    { return nil, nil }
func (m *mockK8sService) GetSecrets(context.Context, string) ([]v1.Secret, error) { return nil, nil }
func (m *mockK8sService) GetSecretInfos(context.Context, string) ([]kubernetes.SecretInfo, error) {
	return nil, nil
}
func (m *mockK8sService) GetUser(context.Context) (string, error)                   { return "", nil }
func (m *mockK8sService) IsClusterAdmin(context.Context) (bool, error)              { return false, nil }
func (m *mockK8sService) GetUserInfo(context.Context) (*kubernetes.UserInfo, error) { return nil, nil }
func (m *mockK8sService) CanAccessResource(context.Context, string, string, string, string, string) (bool, error) {
	return false, nil
}
func (m *mockK8sService) ListResources(context.Context, schema.GroupVersionResource, string) (*unstructured.UnstructuredList, error) {
	return nil, nil
}
func (m *mockK8sService) GetResource(context.Context, schema.GroupVersionResource, string, string) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) CreateResource(context.Context, schema.GroupVersionResource, string, *unstructured.Unstructured) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) DiscoverResourceGVR(context.Context, string, string, string, []string) (schema.GroupVersionResource, error) {
	return schema.GroupVersionResource{}, nil
}
func (m *mockK8sService) PatchResource(context.Context, schema.GroupVersionResource, string, string, types.PatchType, []byte) (*unstructured.Unstructured, error) {
	return nil, nil
}
func (m *mockK8sService) PatchDeployment(context.Context, string, string, types.PatchType, []byte) error {
	return nil
}

type mockS3Service struct {
	getObjectFn              func(ctx context.Context, opts s3.ConnectionOptions, input s3.GetObjectInput) (io.ReadCloser, string, error)
	downloadObjectFn         func(ctx context.Context, opts s3.ConnectionOptions, input s3.DownloadObjectInput) (io.ReadCloser, string, error)
	uploadObjectFn           func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error
	listObjectsFn            func(ctx context.Context, opts s3.ConnectionOptions, query s3.ListObjectsQuery) (*s3.ListObjectsResponse, error)
	objectExistsFn           func(ctx context.Context, opts s3.ConnectionOptions, input s3.ObjectExistsInput) (bool, error)
	resolveNonCollidingKeyFn func(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error)
}

func (m *mockS3Service) GetObject(ctx context.Context, opts s3.ConnectionOptions, input s3.GetObjectInput) (io.ReadCloser, string, error) {
	return m.getObjectFn(ctx, opts, input)
}
func (m *mockS3Service) DownloadObject(ctx context.Context, opts s3.ConnectionOptions, input s3.DownloadObjectInput) (io.ReadCloser, string, error) {
	return m.downloadObjectFn(ctx, opts, input)
}
func (m *mockS3Service) UploadObject(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
	return m.uploadObjectFn(ctx, opts, input)
}
func (m *mockS3Service) ListObjects(ctx context.Context, opts s3.ConnectionOptions, query s3.ListObjectsQuery) (*s3.ListObjectsResponse, error) {
	return m.listObjectsFn(ctx, opts, query)
}
func (m *mockS3Service) ObjectExists(ctx context.Context, opts s3.ConnectionOptions, input s3.ObjectExistsInput) (bool, error) {
	return m.objectExistsFn(ctx, opts, input)
}
func (m *mockS3Service) ResolveNonCollidingKey(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error) {
	return m.resolveNonCollidingKeyFn(ctx, opts, input)
}

type mockPipelinesServiceForS3 struct {
	discoverReadyDSPAFn func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error)
}

func (m *mockPipelinesServiceForS3) DiscoverReadyDSPA(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
	return m.discoverReadyDSPAFn(ctx, namespace)
}

// Unused — stub to satisfy pipelines.Service
func (m *mockPipelinesServiceForS3) CreatePipelineRun(context.Context, string, *pipelines.CreatePipelineRunInput) (*pipelines.PipelineRun, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetPipelineRun(context.Context, string, string) (*pipelines.PipelineRun, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) ListPipelineRuns(context.Context, string, *pipelines.ListRunsParams) (*pipelines.PipelineRunResponse, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) TerminateRun(context.Context, string, string) error { return nil }
func (m *mockPipelinesServiceForS3) RetryRun(context.Context, string, string) error     { return nil }
func (m *mockPipelinesServiceForS3) DeleteRun(context.Context, string, string) error    { return nil }
func (m *mockPipelinesServiceForS3) ListPipelines(context.Context, string, string) (*pipelines.PipelinesResponse, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetPipelineVersion(context.Context, string, string, string) (*pipelines.PipelineVersion, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetPipelineInputParameters(context.Context, string, string, string) ([]string, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) ListPipelineVersions(context.Context, string, string) (*pipelines.PipelineVersionsResponse, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) CreatePipeline(context.Context, string, string) (*pipelines.Pipeline, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) UploadPipelineVersion(context.Context, string, string, string, []byte) (*pipelines.PipelineVersion, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) DiscoverPipelineByName(context.Context, string, string, string) (*pipelines.DiscoveredPipeline, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) DiscoverNamedPipelines(context.Context, string, string, map[string]string) (map[string]*pipelines.DiscoveredPipeline, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) EnsurePipeline(context.Context, string, pipelines.PipelineDefinition) (*pipelines.DiscoveredPipeline, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetAllPipelineRuns(context.Context, string, string) ([]pipelines.PipelineRun, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetPipelineRunWithSpec(context.Context, string, string) (*pipelines.PipelineRun, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) EnableManagedPipelines(context.Context, string) (*pipelines.EnableManagedPipelinesResult, error) {
	return nil, nil
}
func (m *mockPipelinesServiceForS3) GetDSPAStatus(context.Context, string) (*pipelines.DSPAStatus, error) {
	return nil, nil
}

// --- Helpers ---

func makeK8sSecret(name, namespace string, data map[string][]byte) *v1.Secret {
	return &v1.Secret{
		ObjectMeta: metav1.ObjectMeta{Name: name, Namespace: namespace},
		Data:       data,
	}
}

func standardSecretData() map[string][]byte {
	return map[string][]byte{
		"AWS_ACCESS_KEY_ID":     []byte("AKIA"),
		"AWS_SECRET_ACCESS_KEY": []byte("secret"),
		"AWS_DEFAULT_REGION":    []byte("us-east-1"),
		"AWS_S3_ENDPOINT":       []byte("https://s3.example.com"),
		"AWS_S3_BUCKET":         []byte("my-bucket"),
	}
}

// === extractAWSS3ConnectionOptions ===

func TestExtractAWSS3ConnectionOptions(t *testing.T) {
	t.Run("valid secret", func(t *testing.T) {
		opts, bucket, err := extractAWSS3ConnectionOptions(standardSecretData())
		if err != nil {
			t.Fatal(err)
		}
		if opts.AccessKeyID != "AKIA" || opts.SecretAccessKey != "secret" {
			t.Errorf("credentials: %+v", opts)
		}
		if opts.Region != "us-east-1" || opts.BaseEndpoint != "https://s3.example.com" {
			t.Errorf("region/endpoint: %+v", opts)
		}
		if opts.ChecksumAlgorithm != "" {
			t.Errorf("ChecksumAlgorithm = %q, want empty by default", opts.ChecksumAlgorithm)
		}
		if bucket != "my-bucket" {
			t.Errorf("bucket = %q", bucket)
		}
	})

	t.Run("parses optional checksum algorithm", func(t *testing.T) {
		data := standardSecretData()
		data[s3.ChecksumAlgorithmSecretKey] = []byte("crc32c")
		algorithm, disabled, err := parseS3UploadChecksumOptions(data)
		if err != nil {
			t.Fatal(err)
		}
		if algorithm != "CRC32C" || disabled {
			t.Errorf("checksum options = (%q, %t), want (CRC32C, false)", algorithm, disabled)
		}
	})

	t.Run("rejects unsupported checksum algorithm", func(t *testing.T) {
		data := standardSecretData()
		data[s3.ChecksumAlgorithmSecretKey] = []byte("invalid")
		_, _, err := parseS3UploadChecksumOptions(data)
		if err == nil || !strings.Contains(err.Error(), s3.ChecksumAlgorithmSecretKey) {
			t.Errorf("expected checksum configuration error, got %v", err)
		}
	})

	t.Run("missing access key", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_ACCESS_KEY_ID")
		_, _, err := extractAWSS3ConnectionOptions(data)
		if err == nil || !strings.Contains(err.Error(), "AWS_ACCESS_KEY_ID") {
			t.Errorf("expected AWS_ACCESS_KEY_ID error, got %v", err)
		}
	})

	t.Run("missing secret key", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_SECRET_ACCESS_KEY")
		_, _, err := extractAWSS3ConnectionOptions(data)
		if err == nil || !strings.Contains(err.Error(), "AWS_SECRET_ACCESS_KEY") {
			t.Errorf("expected error, got %v", err)
		}
	})

	t.Run("missing region", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_DEFAULT_REGION")
		_, _, err := extractAWSS3ConnectionOptions(data)
		if err == nil || !strings.Contains(err.Error(), "AWS_DEFAULT_REGION") {
			t.Errorf("expected error, got %v", err)
		}
	})

	t.Run("missing endpoint", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_S3_ENDPOINT")
		_, _, err := extractAWSS3ConnectionOptions(data)
		if err == nil || !strings.Contains(err.Error(), "AWS_S3_ENDPOINT") {
			t.Errorf("expected error, got %v", err)
		}
	})

	t.Run("bucket is optional", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_S3_BUCKET")
		_, bucket, err := extractAWSS3ConnectionOptions(data)
		if err != nil {
			t.Fatal(err)
		}
		if bucket != "" {
			t.Errorf("expected empty bucket, got %q", bucket)
		}
	})

	t.Run("case-insensitive key lookup", func(t *testing.T) {
		data := map[string][]byte{
			"aws_access_key_id":     []byte("lower-ak"),
			"aws_secret_access_key": []byte("lower-sk"),
			"aws_default_region":    []byte("eu-west-1"),
			"aws_s3_endpoint":       []byte("https://minio.local"),
		}
		opts, _, err := extractAWSS3ConnectionOptions(data)
		if err != nil {
			t.Fatal(err)
		}
		if opts.AccessKeyID != "lower-ak" {
			t.Errorf("AccessKeyID = %q", opts.AccessKeyID)
		}
	})

	t.Run("ambiguous case variants error", func(t *testing.T) {
		data := map[string][]byte{
			"Aws_Access_Key_Id":     []byte("mixed"),
			"aws_access_key_id":     []byte("lower"),
			"AWS_SECRET_ACCESS_KEY": []byte("sk"),
			"AWS_DEFAULT_REGION":    []byte("r"),
			"AWS_S3_ENDPOINT":       []byte("e"),
		}
		_, _, err := extractAWSS3ConnectionOptions(data)
		if err == nil || !strings.Contains(err.Error(), "ambiguous") {
			t.Errorf("expected ambiguous error, got %v", err)
		}
	})
}

// === ValidateCsvUpload ===

func TestValidateCsvUpload(t *testing.T) {
	tests := []struct {
		name        string
		contentType string
		filename    string
		want        string
		wantErr     bool
	}{
		{"text/csv", "text/csv", "file.csv", "text/csv", false},
		{"text/csv with charset", "text/csv; charset=utf-8", "file.csv", "text/csv", false},
		{"octet-stream with csv filename", "application/octet-stream", "data.csv", "text/csv", false},
		{"octet-stream without csv filename", "application/octet-stream", "data.parquet", "", true},
		{"empty content-type with csv filename", "", "data.csv", "text/csv", false},
		{"empty content-type without csv filename", "", "data.parquet", "", true},
		{"unsupported content-type", "application/json", "file.json", "", true},
		{"text/csv no filename", "text/csv", "", "text/csv", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ValidateCsvUpload(tt.contentType, tt.filename)
			if (err != nil) != tt.wantErr {
				t.Errorf("error = %v, wantErr %v", err, tt.wantErr)
			}
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

// === resolveCredsAndBucket ===

func TestResolveFromSecret(t *testing.T) {
	t.Run("uses secret data and caller bucket", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("my-secret", "ns", standardSecretData()), nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, nil)

		opts, bucket, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns", SecretName: "my-secret", Bucket: "override-bucket",
		})
		if err != nil {
			t.Fatal(err)
		}
		if opts.AccessKeyID != "AKIA" {
			t.Errorf("AccessKeyID = %q", opts.AccessKeyID)
		}
		if bucket != "override-bucket" {
			t.Errorf("bucket = %q, want override", bucket)
		}
	})

	t.Run("falls back to secret bucket", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", standardSecretData()), nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, nil)

		_, bucket, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns", SecretName: "s",
		})
		if err != nil {
			t.Fatal(err)
		}
		if bucket != "my-bucket" {
			t.Errorf("bucket = %q, want my-bucket from secret", bucket)
		}
	})

	t.Run("error when no bucket available", func(t *testing.T) {
		data := standardSecretData()
		delete(data, "AWS_S3_BUCKET")
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", data), nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, nil)

		_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns", SecretName: "s",
		})
		if err == nil || !strings.Contains(err.Error(), "bucket is required") {
			t.Errorf("expected bucket error, got %v", err)
		}
	})

	t.Run("secret fetch error", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return nil, fmt.Errorf("not found")
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, nil)

		_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns", SecretName: "missing",
		})
		if err == nil {
			t.Error("expected error")
		}
	})
}

func TestResolveFromDSPA(t *testing.T) {
	dspaSpec := &pipelines.DSPAObjectStorageSpec{
		SecretName:     "dspa-secret",
		AccessKeyField: "access_key",
		SecretKeyField: "secret_key",
		EndpointURL:    "https://minio.ns.svc:9000",
		Bucket:         "pipeline-bucket",
		Region:         "us-west-2",
	}

	t.Run("resolves from DSPA spec and secret", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
					"access_key":                  []byte("dspa-ak"),
					"secret_key":                  []byte("dspa-sk"),
					s3.ChecksumAlgorithmSecretKey: []byte("SHA256"),
				}), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{
					Name: "dspa1", Namespace: "ns",
					APIServerURL:  "https://ds-pipeline.svc:8443",
					ObjectStorage: dspaSpec,
				}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, pip)

		opts, bucket, err := repo.resolveUploadCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns",
		})
		if err != nil {
			t.Fatal(err)
		}
		if opts.AccessKeyID != "dspa-ak" || opts.SecretAccessKey != "dspa-sk" {
			t.Errorf("credentials: %+v", opts)
		}
		if opts.Region != "us-west-2" {
			t.Errorf("Region = %q", opts.Region)
		}
		if opts.ChecksumAlgorithm != "SHA256" {
			t.Errorf("ChecksumAlgorithm = %q, want SHA256", opts.ChecksumAlgorithm)
		}
		if opts.BaseEndpoint != "https://minio.ns.svc:9000" {
			t.Errorf("BaseEndpoint = %q", opts.BaseEndpoint)
		}
		if bucket != "pipeline-bucket" {
			t.Errorf("bucket = %q", bucket)
		}
	})

	t.Run("DSPA caller bucket is ignored (security)", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
					"access_key": []byte("ak"), "secret_key": []byte("sk"),
				}), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{
					Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec,
				}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, pip)

		_, bucket, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{
			Namespace: "ns", Bucket: "attacker-bucket",
		})
		if err != nil {
			t.Fatal(err)
		}
		if bucket != "pipeline-bucket" {
			t.Errorf("bucket = %q, DSPA bucket should always win", bucket)
		}
	})

	t.Run("DSPA secret endpoint override", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
					"access_key":      []byte("ak"),
					"secret_key":      []byte("sk"),
					"AWS_S3_ENDPOINT": []byte("https://overridden-endpoint.com"),
					"AWS_S3_BUCKET":   []byte("overridden-bucket"),
				}), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{
					Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec,
				}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, pip)

		opts, bucket, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
		if err != nil {
			t.Fatal(err)
		}
		if opts.BaseEndpoint != "https://overridden-endpoint.com" {
			t.Errorf("BaseEndpoint = %q, want secret override", opts.BaseEndpoint)
		}
		if bucket != "overridden-bucket" {
			t.Errorf("bucket = %q, want secret override", bucket)
		}
	})

	t.Run("nil object storage", func(t *testing.T) {
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns"}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, nil, pip)

		_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
		if err == nil || !strings.Contains(err.Error(), "no object storage") {
			t.Errorf("expected no object storage error, got %v", err)
		}
	})

	t.Run("missing spec fields", func(t *testing.T) {
		for _, tt := range []struct {
			name string
			spec *pipelines.DSPAObjectStorageSpec
			want string
		}{
			{"no secret name", &pipelines.DSPAObjectStorageSpec{EndpointURL: "e", Bucket: "b"}, "secret name"},
			{"no endpoint", &pipelines.DSPAObjectStorageSpec{SecretName: "s", Bucket: "b"}, "endpoint"},
			{"no bucket", &pipelines.DSPAObjectStorageSpec{SecretName: "s", EndpointURL: "e"}, "bucket"},
		} {
			t.Run(tt.name, func(t *testing.T) {
				pip := &mockPipelinesServiceForS3{
					discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
						return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: tt.spec}, nil
					},
				}
				repo := NewS3Repository(slog.Default(), nil, nil, pip)

				_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
				if err == nil || !strings.Contains(strings.ToLower(err.Error()), tt.want) {
					t.Errorf("expected %q error, got %v", tt.want, err)
				}
			})
		}
	})

	t.Run("DSPA discovery failure", func(t *testing.T) {
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return nil, fmt.Errorf("no ready DSPA")
			},
		}
		repo := NewS3Repository(slog.Default(), nil, nil, pip)

		_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
		if err == nil {
			t.Error("expected error")
		}
	})

	t.Run("DSPA secret missing access key", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
					"secret_key": []byte("sk"),
				}), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: dspaSpec}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, pip)

		_, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
		if err == nil || !strings.Contains(err.Error(), "access_key") {
			t.Errorf("expected missing access_key error, got %v", err)
		}
	})

	t.Run("default region when spec empty", func(t *testing.T) {
		noRegionSpec := *dspaSpec
		noRegionSpec.Region = ""
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
					"access_key": []byte("ak"), "secret_key": []byte("sk"),
				}), nil
			},
		}
		pip := &mockPipelinesServiceForS3{
			discoverReadyDSPAFn: func(ctx context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
				return &pipelines.DiscoveredDSPA{Name: "dspa1", Namespace: "ns", ObjectStorage: &noRegionSpec}, nil
			},
		}
		repo := NewS3Repository(slog.Default(), nil, k8s, pip)

		opts, _, err := repo.resolveCredsAndBucket(context.Background(), S3RequestContext{Namespace: "ns"})
		if err != nil {
			t.Fatal(err)
		}
		if opts.Region != "us-east-1" {
			t.Errorf("Region = %q, want default", opts.Region)
		}
	})
}

func TestS3Repository_InvalidUploadChecksumDoesNotBlockReads(t *testing.T) {
	for _, tc := range []struct {
		name       string
		req        S3RequestContext
		wantBucket string
		wantError  error
	}{
		{
			name:       "explicit secret",
			req:        S3RequestContext{Namespace: "ns", SecretName: "connection"},
			wantBucket: "my-bucket",
			wantError:  ErrS3Configuration,
		},
		{
			name:       "DSPA secret",
			req:        S3RequestContext{Namespace: "ns"},
			wantBucket: "pipeline-bucket",
			wantError:  ErrDSPAConfiguration,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			secretData := standardSecretData()
			if tc.req.SecretName == "" {
				secretData = map[string][]byte{"access_key": []byte("ak"), "secret_key": []byte("sk")}
			}
			secretData[s3.ChecksumAlgorithmSecretKey] = []byte("CRC64NVME")
			k8s := &mockK8sService{
				getSecretFn: func(_ context.Context, namespace, secretName string) (*v1.Secret, error) {
					return makeK8sSecret(secretName, namespace, secretData), nil
				},
			}
			pip := &mockPipelinesServiceForS3{
				discoverReadyDSPAFn: func(_ context.Context, namespace string) (*pipelines.DiscoveredDSPA, error) {
					return &pipelines.DiscoveredDSPA{
						Name: "dspa", Namespace: namespace,
						ObjectStorage: &pipelines.DSPAObjectStorageSpec{
							SecretName: "dspa-secret", AccessKeyField: "access_key", SecretKeyField: "secret_key",
							EndpointURL: "https://s3.example.com", Bucket: "pipeline-bucket",
						},
					}, nil
				},
			}
			readCalled := false
			uploadCalled := false
			s3svc := &mockS3Service{
				listObjectsFn: func(_ context.Context, opts s3.ConnectionOptions, query s3.ListObjectsQuery) (*s3.ListObjectsResponse, error) {
					readCalled = true
					if opts.ChecksumAlgorithm != "" || query.Bucket != tc.wantBucket {
						t.Errorf("read options = %+v, query = %+v", opts, query)
					}
					return &s3.ListObjectsResponse{}, nil
				},
				uploadObjectFn: func(_ context.Context, _ s3.ConnectionOptions, _ s3.UploadObjectInput) error {
					uploadCalled = true
					return nil
				},
			}
			repo := NewS3Repository(slog.Default(), s3svc, k8s, pip)

			if _, err := repo.ListObjects(context.Background(), tc.req, s3.ListObjectsOptions{}); err != nil {
				t.Fatalf("read failed because of upload-only setting: %v", err)
			}
			if !readCalled {
				t.Error("expected list request to reach S3")
			}
			err := repo.UploadObject(context.Background(), tc.req, "file.csv", strings.NewReader("data"), "text/csv")
			if err == nil || !errors.Is(err, tc.wantError) || !strings.Contains(err.Error(), s3.ChecksumAlgorithmSecretKey) {
				t.Errorf("upload error = %v, want %v mentioning %s", err, tc.wantError, s3.ChecksumAlgorithmSecretKey)
			}
			if uploadCalled {
				t.Error("upload reached S3 with an invalid checksum setting")
			}
		})
	}
}

// === S3Repository operations ===

func TestS3Repository_GetObject(t *testing.T) {
	k8s := &mockK8sService{
		getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return makeK8sSecret("s", "ns", standardSecretData()), nil
		},
	}
	var gotInput s3.DownloadObjectInput
	s3svc := &mockS3Service{
		downloadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.DownloadObjectInput) (io.ReadCloser, string, error) {
			gotInput = input
			return io.NopCloser(strings.NewReader("data")), "text/csv", nil
		},
	}
	repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

	result, err := repo.GetObject(context.Background(), S3RequestContext{Namespace: "ns", SecretName: "s"}, "path/file.csv")
	if err != nil {
		t.Fatal(err)
	}
	defer result.Body.Close()

	if result.ContentType != "text/csv" {
		t.Errorf("content type = %q", result.ContentType)
	}
	if result.ForceDownload {
		t.Error("text/csv should allow inline viewing")
	}
	if gotInput.Bucket != "my-bucket" || gotInput.Key != "path/file.csv" {
		t.Errorf("input: %+v", gotInput)
	}
}

func TestS3Repository_UploadCSVFile(t *testing.T) {
	t.Run("resolves key and uploads", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", standardSecretData()), nil
			},
		}
		var uploadedKey, uploadedChecksum string
		s3svc := &mockS3Service{
			resolveNonCollidingKeyFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error) {
				return input.Key, nil
			},
			uploadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
				uploadedKey = input.Key
				uploadedChecksum = string(opts.ChecksumAlgorithm)
				return nil
			},
		}
		repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

		key, err := repo.UploadCSVFile(context.Background(),
			S3RequestContext{Namespace: "ns", SecretName: "s"},
			"data/file.csv", strings.NewReader("csv-data"), "text/csv", "file.csv", 5)
		if err != nil {
			t.Fatal(err)
		}
		if key != "data/file.csv" || uploadedKey != "data/file.csv" {
			t.Errorf("key = %q, uploaded = %q", key, uploadedKey)
		}
		if uploadedChecksum != "" {
			t.Errorf("ChecksumAlgorithm = %q, want empty for default connection", uploadedChecksum)
		}
	})

	t.Run("passes configured checksum to upload", func(t *testing.T) {
		secretData := standardSecretData()
		secretData[s3.ChecksumAlgorithmSecretKey] = []byte("CRC32")
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", secretData), nil
			},
		}
		var uploadedChecksum string
		s3svc := &mockS3Service{
			resolveNonCollidingKeyFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error) {
				return input.Key, nil
			},
			uploadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
				uploadedChecksum = string(opts.ChecksumAlgorithm)
				return nil
			},
		}
		repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

		_, err := repo.UploadCSVFile(context.Background(),
			S3RequestContext{Namespace: "ns", SecretName: "s"},
			"data/file.csv", strings.NewReader("csv-data"), "text/csv", "file.csv", 5)
		if err != nil {
			t.Fatal(err)
		}
		if uploadedChecksum != "CRC32" {
			t.Errorf("ChecksumAlgorithm = %q, want CRC32", uploadedChecksum)
		}
	})

	t.Run("rejects non-csv content type", func(t *testing.T) {
		repo := NewS3Repository(slog.Default(), nil, nil, nil)
		_, err := repo.UploadCSVFile(context.Background(),
			S3RequestContext{}, "data.json", nil, "application/json", "data.json", 5)
		if err == nil {
			t.Error("expected error for non-csv")
		}
	})

	t.Run("collision resolved key returned", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", standardSecretData()), nil
			},
		}
		s3svc := &mockS3Service{
			resolveNonCollidingKeyFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error) {
				return "data/file-1.csv", nil
			},
			uploadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
				return nil
			},
		}
		repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

		key, err := repo.UploadCSVFile(context.Background(),
			S3RequestContext{Namespace: "ns", SecretName: "s"},
			"data/file.csv", strings.NewReader(""), "text/csv", "file.csv", 5)
		if err != nil {
			t.Fatal(err)
		}
		if key != "data/file-1.csv" {
			t.Errorf("key = %q, want resolved key", key)
		}
	})

	t.Run("upload error after key resolution", func(t *testing.T) {
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", standardSecretData()), nil
			},
		}
		s3svc := &mockS3Service{
			resolveNonCollidingKeyFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.ResolveNonCollidingKeyInput) (string, error) {
				return input.Key, nil
			},
			uploadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
				return s3.ErrObjectAlreadyExists
			},
		}
		repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

		_, err := repo.UploadCSVFile(context.Background(),
			S3RequestContext{Namespace: "ns", SecretName: "s"},
			"data.csv", nil, "text/csv", "data.csv", 5)
		if !errors.Is(err, s3.ErrObjectAlreadyExists) {
			t.Errorf("expected ErrObjectAlreadyExists, got %v", err)
		}
	})
}

func TestS3Repository_UploadObjectPassesConfiguredChecksum(t *testing.T) {
	secretData := standardSecretData()
	secretData[s3.ChecksumAlgorithmSecretKey] = []byte("SHA1")
	k8s := &mockK8sService{
		getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
			return makeK8sSecret("s", "ns", secretData), nil
		},
	}
	var uploadedChecksum string
	s3svc := &mockS3Service{
		uploadObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.UploadObjectInput) error {
			uploadedChecksum = string(opts.ChecksumAlgorithm)
			return nil
		},
	}
	repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

	if err := repo.UploadObject(context.Background(), S3RequestContext{Namespace: "ns", SecretName: "s"},
		"data/file.txt", strings.NewReader("data"), "text/plain"); err != nil {
		t.Fatal(err)
	}
	if uploadedChecksum != "SHA1" {
		t.Errorf("ChecksumAlgorithm = %q, want SHA1", uploadedChecksum)
	}
}

func TestS3Repository_GetCSVSchema(t *testing.T) {
	t.Run("rejects non-csv key", func(t *testing.T) {
		repo := NewS3Repository(slog.Default(), nil, nil, nil)
		_, err := repo.GetCSVSchema(context.Background(), S3RequestContext{}, "data.parquet")
		if err == nil || !strings.Contains(err.Error(), ".csv") {
			t.Errorf("expected csv error, got %v", err)
		}
	})

	t.Run("passes range header for schema fetch", func(t *testing.T) {
		var gotRange string
		k8s := &mockK8sService{
			getSecretFn: func(ctx context.Context, namespace, secretName string) (*v1.Secret, error) {
				return makeK8sSecret("s", "ns", standardSecretData()), nil
			},
		}
		s3svc := &mockS3Service{
			getObjectFn: func(ctx context.Context, opts s3.ConnectionOptions, input s3.GetObjectInput) (io.ReadCloser, string, error) {
				gotRange = input.Range
				// Return minimal valid CSV to avoid schema parse errors
				return io.NopCloser(strings.NewReader("col1,col2\n" + strings.Repeat("a,b\n", 100))), "text/csv", nil
			},
		}
		repo := NewS3Repository(slog.Default(), s3svc, k8s, nil)

		_, err := repo.GetCSVSchema(context.Background(),
			S3RequestContext{Namespace: "ns", SecretName: "s"}, "data.csv")
		if err != nil {
			t.Fatal(err)
		}
		if gotRange != csvSchemaRange {
			t.Errorf("Range = %q, want %q", gotRange, csvSchemaRange)
		}
	})
}

func TestResolveUploadChecksumOptionsFromSecretSources(t *testing.T) {
	tests := []struct {
		name           string
		algorithm      string
		disable        string
		wantAlgorithm  s3.ChecksumAlgorithm
		wantDisabled   bool
		wantErrorField []string
	}{
		{name: "absent options"},
		{name: "false flag", disable: "false"},
		{name: "true flag", disable: "true", wantDisabled: true},
		{name: "invalid flag", disable: "sometimes", wantErrorField: []string{s3.DisableUploadChecksumTrailersSecretKey}},
		{name: "invalid algorithm", algorithm: "CRC64NVME", wantErrorField: []string{s3.ChecksumAlgorithmSecretKey}},
		{name: "conflicting algorithm and flag", algorithm: "SHA256", disable: "true", wantErrorField: []string{s3.DisableUploadChecksumTrailersSecretKey, s3.ChecksumAlgorithmSecretKey}},
	}

	addChecksumValues := func(data map[string][]byte, tc struct {
		name           string
		algorithm      string
		disable        string
		wantAlgorithm  s3.ChecksumAlgorithm
		wantDisabled   bool
		wantErrorField []string
	}) {
		if tc.algorithm != "" {
			data[s3.ChecksumAlgorithmSecretKey] = []byte(tc.algorithm)
		}
		if tc.disable != "" {
			data[s3.DisableUploadChecksumTrailersSecretKey] = []byte(tc.disable)
		}
	}

	for _, source := range []string{"explicit secret", "DSPA secret"} {
		t.Run(source, func(t *testing.T) {
			for _, tc := range tests {
				t.Run(tc.name, func(t *testing.T) {
					data := standardSecretData()
					addChecksumValues(data, tc)
					k8s := &mockK8sService{
						getSecretFn: func(context.Context, string, string) (*v1.Secret, error) {
							if source == "DSPA secret" {
								return makeK8sSecret("dspa-secret", "ns", map[string][]byte{
									"access_key": []byte("ak"), "secret_key": []byte("sk"),
									s3.ChecksumAlgorithmSecretKey:             data[s3.ChecksumAlgorithmSecretKey],
									s3.DisableUploadChecksumTrailersSecretKey: data[s3.DisableUploadChecksumTrailersSecretKey],
								}), nil
							}
							return makeK8sSecret("s", "ns", data), nil
						},
					}
					var pipelinesService *mockPipelinesServiceForS3
					req := S3RequestContext{Namespace: "ns", SecretName: "s"}
					if source == "DSPA secret" {
						req.SecretName = ""
						pipelinesService = &mockPipelinesServiceForS3{
							discoverReadyDSPAFn: func(context.Context, string) (*pipelines.DiscoveredDSPA, error) {
								return &pipelines.DiscoveredDSPA{
									Name: "dspa1", Namespace: "ns",
									ObjectStorage: &pipelines.DSPAObjectStorageSpec{
										SecretName: "dspa-secret", AccessKeyField: "access_key", SecretKeyField: "secret_key",
										EndpointURL: "https://minio.ns.svc:9000", Bucket: "pipeline-bucket",
									},
								}, nil
							},
						}
					}
					repo := NewS3Repository(slog.Default(), nil, k8s, pipelinesService)
					opts, _, err := repo.resolveUploadCredsAndBucket(context.Background(), req)
					if len(tc.wantErrorField) > 0 {
						if err == nil {
							t.Fatal("expected invalid checksum options to fail")
						}
						for _, field := range tc.wantErrorField {
							if !strings.Contains(err.Error(), field) {
								t.Errorf("error %q does not mention %s", err, field)
							}
						}
						return
					}
					if err != nil {
						t.Fatal(err)
					}
					if opts.ChecksumAlgorithm != tc.wantAlgorithm || opts.DisableUploadChecksumTrailers != tc.wantDisabled {
						t.Errorf("resolved checksum options = (%q, %t), want (%q, %t)", opts.ChecksumAlgorithm, opts.DisableUploadChecksumTrailers, tc.wantAlgorithm, tc.wantDisabled)
					}
				})
			}
		})
	}
}
