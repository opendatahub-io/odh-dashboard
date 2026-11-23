package mlflow

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/client-go/dynamic"
	dynamicfake "k8s.io/client-go/dynamic/fake"
	"k8s.io/client-go/rest"
)

func TestDiscoverMLflowURLWithClient(t *testing.T) {
	cr := func(name, url string) runtime.Object {
		return &unstructured.Unstructured{Object: map[string]any{
			"apiVersion": "mlflow.opendatahub.io/v1",
			"kind":       "MLflow",
			"metadata":   map[string]any{"name": name},
			"status":     map[string]any{"address": map[string]any{"url": url}},
		}}
	}
	for _, tt := range []struct {
		name    string
		objects []runtime.Object
		want    string
		wantErr string
	}{
		{name: "missing CR", wantErr: "no MLflow CR"},
		{name: "not ready", objects: []runtime.Object{cr("mlflow", "")}, wantErr: "empty status.address.url"},
		{
			name: "ready", objects: []runtime.Object{cr("mlflow", "https://mlflow.svc:8443/mlflow")},
			want: "https://mlflow.svc:8443/mlflow",
		},
		{
			name: "ambiguous", objects: []runtime.Object{cr("one", "https://one.svc"), cr("two", "https://two.svc")},
			wantErr: "multiple MLflow CRs",
		},
	} {
		t.Run(tt.name, func(t *testing.T) {
			dynClient := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(),
				map[schema.GroupVersionResource]string{MLflowGVR: "MLflowList"}, tt.objects...)
			got, err := DiscoverMLflowURLWithClient(context.Background(), dynClient)
			if tt.wantErr != "" {
				require.ErrorContains(t, err, tt.wantErr)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestDiscoverMLflowURLCancellation(t *testing.T) {
	started := make(chan struct{})
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		close(started)
		<-r.Context().Done()
	}))
	defer server.Close()
	dynClient, err := dynamic.NewForConfig(&rest.Config{Host: server.URL})
	require.NoError(t, err)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	done := make(chan error, 1)
	go func() {
		_, err := DiscoverMLflowURLWithClient(ctx, dynClient)
		done <- err
	}()

	select {
	case <-started:
	case <-time.After(5 * time.Second):
		t.Fatal("MLflow discovery did not issue a request")
	}
	cancel()
	select {
	case err := <-done:
		require.ErrorIs(t, err, context.Canceled)
	case <-time.After(time.Second):
		t.Fatal("MLflow discovery ignored cancellation")
	}
}

func TestParseAddressURL(t *testing.T) {
	tests := []struct {
		name    string
		obj     map[string]any
		want    string
		wantErr string
	}{
		{
			name: "valid status.address.url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "https://mlflow.redhat-ods-applications.svc:8443",
					},
				},
			},
			want: "https://mlflow.redhat-ods-applications.svc:8443",
		},
		{
			name: "missing status field",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
			},
			wantErr: "has no status field",
		},
		{
			name: "missing address field",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status":   map[string]any{},
			},
			wantErr: "has no status.address field",
		},
		{
			name: "missing url in address",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{},
				},
			},
			wantErr: "has no status.address.url",
		},
		{
			name: "empty url string",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "",
					},
				},
			},
			wantErr: "has empty status.address.url",
		},
		{
			name: "whitespace-only url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "   ",
					},
				},
			},
			wantErr: "has empty status.address.url",
		},
		{
			name: "status is not a map",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status":   "not-a-map",
			},
			wantErr: "has no status field",
		},
		{
			name: "address is not a map",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": "not-a-map",
				},
			},
			wantErr: "has no status.address field",
		},
		{
			name: "url is not a string",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": 42,
					},
				},
			},
			wantErr: "has no status.address.url",
		},
		{
			name: "malformed url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "not-a-url",
					},
				},
			},
			wantErr: "has invalid status.address.url",
		},
		{
			name: "url with unsupported scheme",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "ftp://mlflow.example.com",
					},
				},
			},
			wantErr: "has invalid status.address.url",
		},
		{
			name: "url with embedded credentials",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"address": map[string]any{
						"url": "https://user:pass@mlflow.example.com",
					},
				},
			},
			wantErr: "must not include credentials",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item := &unstructured.Unstructured{Object: tc.obj}
			got, err := parseAddressURL(item)

			if tc.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.wantErr)
				assert.Empty(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want, got)
			}
		})
	}
}

func TestParseExternalURL(t *testing.T) {
	tests := []struct {
		name    string
		obj     map[string]any
		want    string
		wantErr string
	}{
		{
			name: "valid status.url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "https://rh-ai.apps.rosa.example.com/mlflow",
				},
			},
			want: "https://rh-ai.apps.rosa.example.com/mlflow",
		},
		{
			name: "missing status field",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
			},
			wantErr: "has no status field",
		},
		{
			name: "missing url field",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status":   map[string]any{},
			},
			wantErr: "has no status.url field",
		},
		{
			name: "empty url string",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "",
				},
			},
			wantErr: "has empty status.url",
		},
		{
			name: "whitespace-only url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "   ",
				},
			},
			wantErr: "has empty status.url",
		},
		{
			name: "url is not a string",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": 42,
				},
			},
			wantErr: "has no status.url field",
		},
		{
			name: "malformed url",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "not-a-url",
				},
			},
			wantErr: "has invalid status.url",
		},
		{
			name: "url with unsupported scheme",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "ftp://mlflow.example.com",
				},
			},
			wantErr: "has invalid status.url",
		},
		{
			name: "http url is valid",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "http://mlflow.example.com/mlflow",
				},
			},
			want: "http://mlflow.example.com/mlflow",
		},
		{
			name: "url with embedded credentials",
			obj: map[string]any{
				"metadata": map[string]any{"name": "mlflow"},
				"status": map[string]any{
					"url": "https://user:pass@mlflow.example.com/mlflow",
				},
			},
			wantErr: "must not include credentials",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			item := &unstructured.Unstructured{Object: tc.obj}
			got, err := parseExternalURL(item)

			if tc.wantErr != "" {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tc.wantErr)
				assert.Empty(t, got)
			} else {
				require.NoError(t, err)
				assert.Equal(t, tc.want, got)
			}
		})
	}
}

func TestMLflowGVR(t *testing.T) {
	assert.Equal(t, "mlflow.opendatahub.io", MLflowGVR.Group)
	assert.Equal(t, "v1", MLflowGVR.Version)
	assert.Equal(t, "mlflows", MLflowGVR.Resource)
}
