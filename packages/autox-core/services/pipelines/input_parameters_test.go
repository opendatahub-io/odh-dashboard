package pipelines

import (
	"context"
	"errors"
	"testing"
)

func TestExtractPipelineInputParameters(t *testing.T) {
	tests := []struct {
		name    string
		spec    string
		want    []string
		wantErr bool
	}{
		{
			name: "direct KFP v2 spec",
			spec: `{
                "root": {
                    "inputDefinitions": {
                        "parameters": {
                            "chunk_size": {"parameterType": "NUMBER_INTEGER"},
                            "embedding_model_id": {"parameterType": "STRING"},
                            "batch_size": {"parameterType": "NUMBER_INTEGER"}
                        }
                    }
                }
            }`,
			want: []string{"batch_size", "chunk_size", "embedding_model_id"},
		},
		{
			name: "wrapped pipeline spec",
			spec: `{
                "pipeline_spec": {
                    "root": {
                        "inputDefinitions": {
                            "parameters": {
                                "input_data_keys": {"parameterType": "LIST"}
                            }
                        }
                    }
                }
            }`,
			want: []string{"input_data_keys"},
		},
		{
			name:    "malformed JSON",
			spec:    `{`,
			wantErr: true,
		},
		{
			name:    "missing input definitions",
			spec:    `{"root":{"dag":{"tasks":{}}}}`,
			wantErr: true,
		},
		{
			name:    "empty input definitions",
			spec:    `{"root":{"inputDefinitions":{"parameters":{}}}}`,
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := extractPipelineInputParameters([]byte(tt.spec))
			if (err != nil) != tt.wantErr {
				t.Fatalf("extractPipelineInputParameters() error = %v, wantErr %v", err, tt.wantErr)
			}
			if !tt.wantErr && len(got) != len(tt.want) {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
			for i := range tt.want {
				if got[i] != tt.want[i] {
					t.Errorf("got[%d] = %q, want %q", i, got[i], tt.want[i])
				}
			}
		})
	}
}

func TestServiceGetPipelineInputParametersCachesByVersion(t *testing.T) {
	clientCalls := 0
	client := &mockPipelineClient{
		getPipelineVersionFn: func(_ context.Context, _ string, _ string, versionID string) (*PipelineVersion, error) {
			clientCalls++
			return &PipelineVersion{
				PipelineVersionID: versionID,
				PipelineSpec:      []byte(`{"root":{"inputDefinitions":{"parameters":{"` + versionID + `":{"parameterType":"STRING"}}}}}`),
			}, nil
		},
	}
	svc := newTestServiceWithMock(client)
	svc.dspaCache.set("other-ns", &DiscoveredDSPA{
		Name:         "dspa2",
		Namespace:    "other-ns",
		APIServerURL: "https://ds-pipeline.other-ns.svc:8443",
	})

	first, err := svc.GetPipelineInputParameters(testCtx(), "test-ns", "pipeline", "v1")
	if err != nil {
		t.Fatal(err)
	}
	second, err := svc.GetPipelineInputParameters(testCtx(), "test-ns", "pipeline", "v1")
	if err != nil {
		t.Fatal(err)
	}
	third, err := svc.GetPipelineInputParameters(testCtx(), "test-ns", "pipeline", "v2")
	if err != nil {
		t.Fatal(err)
	}
	fourth, err := svc.GetPipelineInputParameters(testCtx(), "other-ns", "pipeline", "v1")
	if err != nil {
		t.Fatal(err)
	}

	if clientCalls != 3 {
		t.Fatalf("GetPipelineVersion call count = %d, want 3", clientCalls)
	}
	if len(first) != 1 || first[0] != "v1" || len(second) != 1 || second[0] != "v1" {
		t.Errorf("cached v1 parameters = %v, %v", first, second)
	}
	if len(third) != 1 || third[0] != "v2" {
		t.Errorf("v2 parameters = %v", third)
	}
	if len(fourth) != 1 || fourth[0] != "v1" {
		t.Errorf("other namespace parameters = %v", fourth)
	}
}

func TestServiceGetPipelineInputParametersDoesNotCacheInvalidSchema(t *testing.T) {
	clientCalls := 0
	client := &mockPipelineClient{
		getPipelineVersionFn: func(_ context.Context, _ string, _ string, _ string) (*PipelineVersion, error) {
			clientCalls++
			return &PipelineVersion{PipelineSpec: []byte(`{"root":{"dag":{}}}`)}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	for range 2 {
		_, err := svc.GetPipelineInputParameters(testCtx(), "test-ns", "pipeline", "v1")
		if !errors.Is(err, ErrPipelineInputSchema) {
			t.Fatalf("error = %v, want ErrPipelineInputSchema", err)
		}
	}

	if clientCalls != 2 {
		t.Fatalf("GetPipelineVersion call count = %d, want 2", clientCalls)
	}
}
