package mlflow

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

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

func TestMLflowGVR(t *testing.T) {
	assert.Equal(t, "mlflow.opendatahub.io", MLflowGVR.Group)
	assert.Equal(t, "v1", MLflowGVR.Version)
	assert.Equal(t, "mlflows", MLflowGVR.Resource)
}
