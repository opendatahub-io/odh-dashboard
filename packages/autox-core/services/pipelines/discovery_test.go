package pipelines

import (
	"context"
	"log/slog"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestValidateDSPAURL(t *testing.T) {
	tests := []struct {
		name    string
		url     string
		wantErr bool
	}{
		{"valid https", "https://ds-pipeline.example.svc:8443", false},
		{"valid http", "http://ds-pipeline.my-ns.svc:8888", false},
		{"unsupported scheme", "ftp://example.com", true},
		{"no scheme", "example.com:8443", true},
		{"credentials in URL", "https://user:pass@example.com", true},
		{"empty hostname", "https://", true},
		{"loopback IPv4", "https://127.0.0.1:8443", true},
		{"loopback IPv6", "https://[::1]:8443", true},
		{"link-local", "https://169.254.169.254", true},
		{"cloud metadata", "https://169.254.169.254/latest/meta-data", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateDSPAURL(tt.url)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateDSPAURL(%q) error = %v, wantErr %v", tt.url, err, tt.wantErr)
			}
		})
	}
}

func TestExtractExternalStorageSpec(t *testing.T) {
	t.Run("full external storage spec", func(t *testing.T) {
		ext := map[string]any{
			"scheme": "https",
			"host":   "s3.amazonaws.com",
			"port":   "443",
			"bucket": "my-bucket",
			"region": "us-west-2",
			"s3CredentialSecret": map[string]any{
				"secretName": "aws-creds",
				"accessKey":  "my_access_key",
				"secretKey":  "my_secret_key",
			},
		}

		spec := extractExternalStorageSpec(ext)
		if spec == nil {
			t.Fatal("expected non-nil spec")
		}
		if spec.SecretName != "aws-creds" {
			t.Errorf("SecretName = %q, want %q", spec.SecretName, "aws-creds")
		}
		if spec.AccessKeyField != "my_access_key" {
			t.Errorf("AccessKeyField = %q, want %q", spec.AccessKeyField, "my_access_key")
		}
		if spec.SecretKeyField != "my_secret_key" {
			t.Errorf("SecretKeyField = %q, want %q", spec.SecretKeyField, "my_secret_key")
		}
		if spec.EndpointURL != "https://s3.amazonaws.com" {
			t.Errorf("EndpointURL = %q, want %q", spec.EndpointURL, "https://s3.amazonaws.com")
		}
		if spec.Bucket != "my-bucket" {
			t.Errorf("Bucket = %q, want %q", spec.Bucket, "my-bucket")
		}
		if spec.Region != "us-west-2" {
			t.Errorf("Region = %q, want %q", spec.Region, "us-west-2")
		}
	})

	t.Run("defaults for access/secret key fields", func(t *testing.T) {
		ext := map[string]any{
			"host":   "minio.example.com",
			"bucket": "b",
			"s3CredentialSecret": map[string]any{
				"secretName": "creds",
			},
		}

		spec := extractExternalStorageSpec(ext)
		if spec == nil {
			t.Fatal("expected non-nil spec")
		}
		if spec.AccessKeyField != "AWS_ACCESS_KEY_ID" {
			t.Errorf("AccessKeyField = %q, want default", spec.AccessKeyField)
		}
		if spec.SecretKeyField != "AWS_SECRET_ACCESS_KEY" {
			t.Errorf("SecretKeyField = %q, want default", spec.SecretKeyField)
		}
		if spec.Region != "us-east-1" {
			t.Errorf("Region = %q, want default us-east-1", spec.Region)
		}
	})

	t.Run("alternative credential field name s3CredentialsSecret", func(t *testing.T) {
		ext := map[string]any{
			"s3CredentialsSecret": map[string]any{
				"secretName": "alt-creds",
			},
		}

		spec := extractExternalStorageSpec(ext)
		if spec == nil {
			t.Fatal("expected non-nil spec")
		}
		if spec.SecretName != "alt-creds" {
			t.Errorf("SecretName = %q, want %q", spec.SecretName, "alt-creds")
		}
	})

	t.Run("alternative secret name field 'name'", func(t *testing.T) {
		ext := map[string]any{
			"s3CredentialSecret": map[string]any{
				"name": "name-field-creds",
			},
		}

		spec := extractExternalStorageSpec(ext)
		if spec == nil {
			t.Fatal("expected non-nil spec")
		}
		if spec.SecretName != "name-field-creds" {
			t.Errorf("SecretName = %q, want %q", spec.SecretName, "name-field-creds")
		}
	})

	t.Run("no secret name returns nil", func(t *testing.T) {
		ext := map[string]any{
			"s3CredentialSecret": map[string]any{},
		}
		if spec := extractExternalStorageSpec(ext); spec != nil {
			t.Error("expected nil for missing secret name")
		}
	})

	t.Run("non-standard port included in URL", func(t *testing.T) {
		ext := map[string]any{
			"scheme": "http",
			"host":   "minio.local",
			"port":   "9000",
			"s3CredentialSecret": map[string]any{"secretName": "s"},
		}
		spec := extractExternalStorageSpec(ext)
		if spec.EndpointURL != "http://minio.local:9000" {
			t.Errorf("EndpointURL = %q, want port included", spec.EndpointURL)
		}
	})

	t.Run("default scheme is https", func(t *testing.T) {
		ext := map[string]any{
			"host":               "s3.example.com",
			"s3CredentialSecret": map[string]any{"secretName": "s"},
		}
		spec := extractExternalStorageSpec(ext)
		if spec.EndpointURL != "https://s3.example.com" {
			t.Errorf("EndpointURL = %q, want https default", spec.EndpointURL)
		}
	})
}

func TestBuildManagedMinIOSpec(t *testing.T) {
	t.Run("default bucket", func(t *testing.T) {
		spec := buildManagedMinIOSpec("dspa1", "my-ns", map[string]any{})
		if spec.SecretName != "ds-pipeline-s3-dspa1" {
			t.Errorf("SecretName = %q", spec.SecretName)
		}
		if spec.Bucket != "mlpipeline" {
			t.Errorf("Bucket = %q, want default mlpipeline", spec.Bucket)
		}
		if spec.EndpointURL != "http://minio-dspa1.my-ns.svc.cluster.local:9000" {
			t.Errorf("EndpointURL = %q", spec.EndpointURL)
		}
		if spec.Region != "us-east-1" {
			t.Errorf("Region = %q", spec.Region)
		}
		if spec.AccessKeyField != "AWS_ACCESS_KEY_ID" || spec.SecretKeyField != "AWS_SECRET_ACCESS_KEY" {
			t.Error("unexpected default key field names")
		}
	})

	t.Run("custom bucket", func(t *testing.T) {
		spec := buildManagedMinIOSpec("dspa2", "ns", map[string]any{"bucket": "custom"})
		if spec.Bucket != "custom" {
			t.Errorf("Bucket = %q, want custom", spec.Bucket)
		}
	})
}

func TestExtractObjectStorageSpec(t *testing.T) {
	t.Run("external takes precedence over managed minio", func(t *testing.T) {
		obj := map[string]any{
			"spec": map[string]any{
				"objectStorage": map[string]any{
					"externalStorage": map[string]any{
						"host":               "external.example.com",
						"s3CredentialSecret": map[string]any{"secretName": "ext-cred"},
					},
					"minio": map[string]any{
						"deploy": true,
					},
				},
			},
		}

		spec := extractObjectStorageSpec(obj, "dspa", "ns")
		if spec == nil {
			t.Fatal("expected non-nil")
		}
		if spec.SecretName != "ext-cred" {
			t.Errorf("should use external storage, got SecretName=%q", spec.SecretName)
		}
	})

	t.Run("managed minio when no external", func(t *testing.T) {
		obj := map[string]any{
			"spec": map[string]any{
				"objectStorage": map[string]any{
					"minio": map[string]any{
						"deploy": true,
						"bucket": "test-bucket",
					},
				},
			},
		}

		spec := extractObjectStorageSpec(obj, "dspa1", "ns")
		if spec == nil {
			t.Fatal("expected non-nil")
		}
		if spec.SecretName != "ds-pipeline-s3-dspa1" {
			t.Errorf("SecretName = %q", spec.SecretName)
		}
		if spec.Bucket != "test-bucket" {
			t.Errorf("Bucket = %q", spec.Bucket)
		}
	})

	t.Run("minio deploy explicitly false returns nil", func(t *testing.T) {
		obj := map[string]any{
			"spec": map[string]any{
				"objectStorage": map[string]any{
					"minio": map[string]any{
						"deploy": false,
					},
				},
			},
		}

		spec := extractObjectStorageSpec(obj, "dspa", "ns")
		if spec != nil {
			t.Error("expected nil when deploy=false")
		}
	})

	t.Run("no object storage returns nil", func(t *testing.T) {
		obj := map[string]any{"spec": map[string]any{}}
		spec := extractObjectStorageSpec(obj, "dspa", "ns")
		if spec != nil {
			t.Error("expected nil")
		}
	})
}

// mockK8sClient for DiscoverReadyDSPA tests
type mockK8sClient struct {
	k8s.Client
	listResourcesFn       func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error)
	discoverResourceGVRFn func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error)
}

func (m *mockK8sClient) ListResources(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
	return m.listResourcesFn(ctx, gvr, namespace)
}
func (m *mockK8sClient) DiscoverResourceGVR(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
	return m.discoverResourceGVRFn(ctx, group, resource, namespace, knownVersions)
}

func newTestPipelineServiceForDiscovery(k8sClient *mockK8sClient) *service {
	k8sSvc := k8s.NewService(k8s.ServiceConfig{Logger: slog.Default()}, k8sClient)
	return &service{
		K8sService:    k8sSvc,
		Logger:        slog.Default(),
		pipelineCache: newPipelineCache(),
		dspaCache:     newDSPACache(),
		inFlight:      make(map[string]chan struct{}),
	}
}

func TestDiscoverReadyDSPA(t *testing.T) {
	dspaGVR := schema.GroupVersionResource{
		Group:    "datasciencepipelinesapplications.opendatahub.io",
		Version:  "v1",
		Resource: "datasciencepipelinesapplications",
	}

	t.Run("discovers ready DSPA with external storage", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "dspa1"},
							"status": map[string]any{
								"conditions": []any{
									map[string]any{"type": "Ready", "status": "True"},
								},
								"components": map[string]any{
									"apiServer": map[string]any{
										"url": "https://ds-pipeline-dspa1.my-ns.svc:8443",
									},
								},
							},
							"spec": map[string]any{
								"objectStorage": map[string]any{
									"externalStorage": map[string]any{
										"host":               "s3.us-east-1.amazonaws.com",
										"bucket":             "my-bucket",
										"s3CredentialSecret": map[string]any{"secretName": "aws-creds"},
									},
								},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		dspa, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if dspa.Name != "dspa1" {
			t.Errorf("Name = %q", dspa.Name)
		}
		if dspa.APIServerURL != "https://ds-pipeline-dspa1.my-ns.svc:8443" {
			t.Errorf("APIServerURL = %q", dspa.APIServerURL)
		}
		if dspa.ObjectStorage == nil {
			t.Fatal("expected ObjectStorage")
		}
		if dspa.ObjectStorage.SecretName != "aws-creds" {
			t.Errorf("SecretName = %q", dspa.ObjectStorage.SecretName)
		}
	})

	t.Run("uses cache on second call", func(t *testing.T) {
		callCount := 0
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				callCount++
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "dspa1"},
							"status": map[string]any{
								"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
								"components": map[string]any{"apiServer": map[string]any{"url": "https://ds-pipeline.svc:8443"}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		_, err = svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}

		if callCount != 1 {
			t.Errorf("expected 1 API call, got %d (cache miss)", callCount)
		}
	})

	t.Run("skips DSPA with invalid URL", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "bad-dspa"},
							"status": map[string]any{
								"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
								"components": map[string]any{"apiServer": map[string]any{"url": "ftp://bad-scheme"}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error when no valid DSPA found")
		}
	})

	t.Run("finds Ready among multiple conditions", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "multi-cond"},
							"status": map[string]any{
								"conditions": []any{
									map[string]any{"type": "DatabaseReady", "status": "True"},
									map[string]any{"type": "APIServerReady", "status": "True"},
									map[string]any{"type": "Ready", "status": "True"},
								},
								"components": map[string]any{"apiServer": map[string]any{"url": "https://ds-pipeline.svc:8443"}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		dspa, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err != nil {
			t.Fatal(err)
		}
		if dspa.Name != "multi-cond" {
			t.Errorf("Name = %q", dspa.Name)
		}
	})

	t.Run("skips DSPA with no conditions", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "no-conditions"},
							"status":   map[string]any{},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error when DSPA has no conditions")
		}
	})

	t.Run("skips DSPA with no components", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "no-components"},
							"status": map[string]any{
								"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error when DSPA has no components")
		}
	})

	t.Run("skips DSPA with empty API server URL", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "empty-url"},
							"status": map[string]any{
								"conditions": []any{map[string]any{"type": "Ready", "status": "True"}},
								"components": map[string]any{"apiServer": map[string]any{"url": ""}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error when API server URL is empty")
		}
	})

	t.Run("empty DSPA list", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{Items: []unstructured.Unstructured{}}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error for empty DSPA list")
		}
	})

	t.Run("skips non-ready DSPA", func(t *testing.T) {
		k8sClient := &mockK8sClient{
			discoverResourceGVRFn: func(ctx context.Context, group, resource, namespace string, knownVersions []string) (schema.GroupVersionResource, error) {
				return dspaGVR, nil
			},
			listResourcesFn: func(ctx context.Context, gvr schema.GroupVersionResource, namespace string) (*unstructured.UnstructuredList, error) {
				return &unstructured.UnstructuredList{
					Items: []unstructured.Unstructured{
						{Object: map[string]any{
							"metadata": map[string]any{"name": "not-ready"},
							"status": map[string]any{
								"conditions": []any{map[string]any{"type": "Ready", "status": "False"}},
								"components": map[string]any{"apiServer": map[string]any{"url": "https://ds-pipeline.svc:8443"}},
							},
						}},
					},
				}, nil
			},
		}

		svc := newTestPipelineServiceForDiscovery(k8sClient)
		ctx := k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})

		_, err := svc.DiscoverReadyDSPA(ctx, "my-ns")
		if err == nil {
			t.Error("expected error when no ready DSPA found")
		}
	})
}
