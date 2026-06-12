package pipelines

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// mockPipelineClient implements Client for service tests.
type mockPipelineClient struct {
	createPipelineRunFn     func(ctx context.Context, baseURL string, input *CreatePipelineRunInput) (*PipelineRun, error)
	getPipelineRunFn        func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error)
	listPipelineRunsFn      func(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error)
	terminateRunFn          func(ctx context.Context, baseURL string, runID string) error
	retryRunFn              func(ctx context.Context, baseURL string, runID string) error
	deleteRunFn             func(ctx context.Context, baseURL string, runID string) error
	listPipelinesFn         func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error)
	getPipelineVersionFn    func(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error)
	listPipelineVersionsFn  func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error)
	createPipelineFn        func(ctx context.Context, baseURL string, name string) (*Pipeline, error)
	uploadPipelineVersionFn func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error)
}

func (m *mockPipelineClient) CreatePipelineRun(ctx context.Context, baseURL string, input *CreatePipelineRunInput) (*PipelineRun, error) {
	return m.createPipelineRunFn(ctx, baseURL, input)
}
func (m *mockPipelineClient) GetPipelineRun(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
	return m.getPipelineRunFn(ctx, baseURL, runID)
}
func (m *mockPipelineClient) ListPipelineRuns(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
	return m.listPipelineRunsFn(ctx, baseURL, params)
}
func (m *mockPipelineClient) TerminateRun(ctx context.Context, baseURL string, runID string) error {
	return m.terminateRunFn(ctx, baseURL, runID)
}
func (m *mockPipelineClient) RetryRun(ctx context.Context, baseURL string, runID string) error {
	return m.retryRunFn(ctx, baseURL, runID)
}
func (m *mockPipelineClient) DeleteRun(ctx context.Context, baseURL string, runID string) error {
	return m.deleteRunFn(ctx, baseURL, runID)
}
func (m *mockPipelineClient) ListPipelines(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
	return m.listPipelinesFn(ctx, baseURL, filter)
}
func (m *mockPipelineClient) GetPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
	return m.getPipelineVersionFn(ctx, baseURL, pipelineID, versionID)
}
func (m *mockPipelineClient) ListPipelineVersions(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
	return m.listPipelineVersionsFn(ctx, baseURL, pipelineID)
}
func (m *mockPipelineClient) CreatePipeline(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
	return m.createPipelineFn(ctx, baseURL, name)
}
func (m *mockPipelineClient) UploadPipelineVersion(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
	return m.uploadPipelineVersionFn(ctx, baseURL, pipelineID, versionName, fileContent)
}

func newTestServiceWithMock(client *mockPipelineClient) *service {
	svc := &service{
		Client:        client,
		Logger:        slog.Default(),
		pipelineCache: newPipelineCache(),
		dspaCache:     newDSPACache(),
		inFlight:      make(map[string]chan struct{}),
	}
	svc.dspaCache.set("test-ns", &DiscoveredDSPA{
		Name:         "dspa1",
		Namespace:    "test-ns",
		APIServerURL: "https://ds-pipeline.test-ns.svc:8443",
	})
	return svc
}

func testCtx() context.Context {
	return k8s.ContextWithIdentity(context.Background(), &k8s.RequestIdentity{Token: "tok"})
}

// --- State Validation Tests ---

func TestService_TerminateRun_StateValidation(t *testing.T) {
	for _, tt := range []struct {
		state   string
		wantErr bool
	}{
		{"PENDING", false},
		{"RUNNING", false},
		{"PAUSED", false},
		{"SUCCEEDED", true},
		{"FAILED", true},
		{"CANCELED", true},
	} {
		t.Run(tt.state, func(t *testing.T) {
			client := &mockPipelineClient{
				getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
					return &PipelineRun{RunID: "r1", State: tt.state}, nil
				},
				terminateRunFn: func(ctx context.Context, baseURL string, runID string) error {
					return nil
				},
			}
			svc := newTestServiceWithMock(client)

			err := svc.TerminateRun(testCtx(), "test-ns", "r1")
			if (err != nil) != tt.wantErr {
				t.Errorf("TerminateRun() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr && !errors.Is(err, ErrInvalidRunState) {
				t.Errorf("expected ErrInvalidRunState, got %v", err)
			}
		})
	}

	t.Run("run not found", func(t *testing.T) {
		client := &mockPipelineClient{
			getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
				return nil, fmt.Errorf("%w: test", ErrPipelineNotFound)
			},
		}
		svc := newTestServiceWithMock(client)

		err := svc.TerminateRun(testCtx(), "test-ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
		}
	})
}

func TestService_RetryRun_StateValidation(t *testing.T) {
	for _, tt := range []struct {
		state   string
		wantErr bool
	}{
		{"FAILED", false},
		{"CANCELED", false},
		{"RUNNING", true},
		{"SUCCEEDED", true},
	} {
		t.Run(tt.state, func(t *testing.T) {
			client := &mockPipelineClient{
				getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
					return &PipelineRun{RunID: "r1", State: tt.state}, nil
				},
				retryRunFn: func(ctx context.Context, baseURL string, runID string) error { return nil },
			}
			svc := newTestServiceWithMock(client)

			err := svc.RetryRun(testCtx(), "test-ns", "r1")
			if (err != nil) != tt.wantErr {
				t.Errorf("RetryRun() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestService_DeleteRun_StateValidation(t *testing.T) {
	for _, tt := range []struct {
		state   string
		wantErr bool
	}{
		{"SUCCEEDED", false},
		{"FAILED", false},
		{"CANCELED", false},
		{"RUNNING", true},
		{"PENDING", true},
	} {
		t.Run(tt.state, func(t *testing.T) {
			client := &mockPipelineClient{
				getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
					return &PipelineRun{RunID: "r1", State: tt.state}, nil
				},
				deleteRunFn: func(ctx context.Context, baseURL string, runID string) error { return nil },
			}
			svc := newTestServiceWithMock(client)

			err := svc.DeleteRun(testCtx(), "test-ns", "r1")
			if (err != nil) != tt.wantErr {
				t.Errorf("DeleteRun() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// --- Case insensitivity ---

func TestService_TerminateRun_CaseInsensitive(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return &PipelineRun{RunID: "r1", State: "running"}, nil
		},
		terminateRunFn: func(ctx context.Context, baseURL string, runID string) error { return nil },
	}
	svc := newTestServiceWithMock(client)

	if err := svc.TerminateRun(testCtx(), "test-ns", "r1"); err != nil {
		t.Errorf("lowercase 'running' should be terminatable: %v", err)
	}
}

// --- Discovery ---

func TestService_DiscoverPipelineByName(t *testing.T) {
	t.Run("finds pipeline and version", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{
					Pipelines: []Pipeline{
						{PipelineID: "p1", DisplayName: "my-pipeline", Namespace: "test-ns"},
					},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{
						{PipelineVersionID: "v2", DisplayName: "my-pipeline-2.0"},
						{PipelineVersionID: "v1", DisplayName: "my-pipeline-1.0"},
					},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.DiscoverPipelineByName(testCtx(), "test-ns", "my-pipeline", "my-pipeline-1.0")
		if err != nil {
			t.Fatal(err)
		}
		if dp == nil {
			t.Fatal("expected non-nil result")
		}
		if dp.PipelineID != "p1" || dp.PipelineVersionID != "v1" {
			t.Errorf("unexpected: %+v", dp)
		}
		if len(dp.AllVersionIDs) != 2 {
			t.Errorf("expected 2 version IDs, got %d", len(dp.AllVersionIDs))
		}
	})

	t.Run("no matching pipeline returns nil", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.DiscoverPipelineByName(testCtx(), "test-ns", "missing", "")
		if err != nil {
			t.Fatal(err)
		}
		if dp != nil {
			t.Error("expected nil for no match")
		}
	})

	t.Run("empty name returns error", func(t *testing.T) {
		svc := newTestServiceWithMock(&mockPipelineClient{})
		_, err := svc.DiscoverPipelineByName(testCtx(), "test-ns", "", "")
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("latest version when versionName is empty", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "pipe"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{
						{PipelineVersionID: "latest", DisplayName: "latest-version"},
						{PipelineVersionID: "old", DisplayName: "old-version"},
					},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.DiscoverPipelineByName(testCtx(), "test-ns", "pipe", "")
		if err != nil {
			t.Fatal(err)
		}
		if dp.PipelineVersionID != "latest" {
			t.Errorf("expected latest version, got %q", dp.PipelineVersionID)
		}
	})

	t.Run("case-insensitive pipeline name match", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "My-Pipeline"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{{PipelineVersionID: "v1"}},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.DiscoverPipelineByName(testCtx(), "test-ns", "my-pipeline", "")
		if err != nil {
			t.Fatal(err)
		}
		if dp == nil {
			t.Error("expected case-insensitive match")
		}
	})
}

// --- GetPipelineRunWithSpec ---

func TestService_GetPipelineRunWithSpec(t *testing.T) {
	t.Run("enriches with pipeline spec", func(t *testing.T) {
		client := &mockPipelineClient{
			getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
				return &PipelineRun{
					RunID: "r1",
					PipelineVersionReference: &PipelineVersionReference{
						PipelineID:        "p1",
						PipelineVersionID: "v1",
					},
				}, nil
			},
			getPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
				return &PipelineVersion{
					PipelineSpec: []byte(`{"components": {}}`),
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		run, err := svc.GetPipelineRunWithSpec(testCtx(), "test-ns", "r1")
		if err != nil {
			t.Fatal(err)
		}
		if len(run.PipelineSpec) == 0 {
			t.Error("expected PipelineSpec to be set")
		}
	})

	t.Run("best-effort: version fetch failure still returns run", func(t *testing.T) {
		client := &mockPipelineClient{
			getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
				return &PipelineRun{
					RunID:                    "r1",
					PipelineVersionReference: &PipelineVersionReference{PipelineID: "p1", PipelineVersionID: "v1"},
				}, nil
			},
			getPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
				return nil, fmt.Errorf("version fetch failed")
			},
		}
		svc := newTestServiceWithMock(client)

		run, err := svc.GetPipelineRunWithSpec(testCtx(), "test-ns", "r1")
		if err != nil {
			t.Fatal(err)
		}
		if run.RunID != "r1" {
			t.Error("expected run to be returned despite version failure")
		}
	})

	t.Run("no version reference skips enrichment", func(t *testing.T) {
		client := &mockPipelineClient{
			getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
				return &PipelineRun{RunID: "r1"}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		run, err := svc.GetPipelineRunWithSpec(testCtx(), "test-ns", "r1")
		if err != nil {
			t.Fatal(err)
		}
		if run.PipelineSpec != nil {
			t.Error("expected nil PipelineSpec when no version ref")
		}
	})

	t.Run("run not found", func(t *testing.T) {
		client := &mockPipelineClient{
			getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
				return nil, fmt.Errorf("%w: missing", ErrPipelineNotFound)
			},
		}
		svc := newTestServiceWithMock(client)

		_, err := svc.GetPipelineRunWithSpec(testCtx(), "test-ns", "r1")
		if !errors.Is(err, ErrPipelineRunNotFound) {
			t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
		}
	})
}

// --- GetAllPipelineRuns ---

func TestService_GetAllPipelineRuns(t *testing.T) {
	t.Run("auto-paginates across version IDs", func(t *testing.T) {
		pageCount := 0
		client := &mockPipelineClient{
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{
						{PipelineVersionID: "v1"},
						{PipelineVersionID: "v2"},
					},
				}, nil
			},
			listPipelineRunsFn: func(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
				pageCount++
				if pageCount == 1 {
					return &PipelineRunResponse{
						Runs:          []PipelineRun{{RunID: "r1"}, {RunID: "r2"}},
						NextPageToken: "page2",
					}, nil
				}
				return &PipelineRunResponse{
					Runs: []PipelineRun{{RunID: "r3"}},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		runs, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "p1")
		if err != nil {
			t.Fatal(err)
		}
		if len(runs) != 3 {
			t.Errorf("expected 3 runs, got %d", len(runs))
		}
	})

	t.Run("no versions returns nil", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		runs, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "p1")
		if err != nil {
			t.Fatal(err)
		}
		if runs != nil {
			t.Errorf("expected nil, got %d runs", len(runs))
		}
	})

	t.Run("uses cached version IDs", func(t *testing.T) {
		listVersionsCalled := false
		client := &mockPipelineClient{
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				listVersionsCalled = true
				return nil, nil
			},
			listPipelineRunsFn: func(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
				return &PipelineRunResponse{Runs: []PipelineRun{{RunID: "r1"}}}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		// Pre-populate pipeline cache
		svc.pipelineCache.set("test-ns", map[string]*DiscoveredPipeline{
			"type": {PipelineID: "p1", AllVersionIDs: []string{"v1", "v2"}},
		})

		runs, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "p1")
		if err != nil {
			t.Fatal(err)
		}
		if len(runs) != 1 {
			t.Errorf("expected 1 run, got %d", len(runs))
		}
		if listVersionsCalled {
			t.Error("should have used cached version IDs")
		}
	})

	t.Run("empty pipelineID returns nil", func(t *testing.T) {
		svc := newTestServiceWithMock(&mockPipelineClient{})
		runs, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "")
		if err != nil {
			t.Fatal(err)
		}
		if runs != nil {
			t.Errorf("expected nil for empty pipelineID, got %d runs", len(runs))
		}
	})

	t.Run("filters empty version IDs from API response", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{
						{PipelineVersionID: "v1"},
						{PipelineVersionID: ""},
						{PipelineVersionID: "  "},
						{PipelineVersionID: "v2"},
					},
				}, nil
			},
			listPipelineRunsFn: func(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
				return &PipelineRunResponse{Runs: []PipelineRun{{RunID: "r1"}}}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		runs, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "p1")
		if err != nil {
			t.Fatal(err)
		}
		if len(runs) != 1 {
			t.Errorf("expected 1 run, got %d", len(runs))
		}
	})

	t.Run("version list error propagated", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return nil, fmt.Errorf("connection refused")
			},
		}
		svc := newTestServiceWithMock(client)

		_, err := svc.GetAllPipelineRuns(testCtx(), "test-ns", "p1")
		if err == nil {
			t.Error("expected error")
		}
	})
}

// --- EnsurePipeline ---

func TestService_EnsurePipeline(t *testing.T) {
	t.Run("already exists", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "pipe"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{{PipelineVersionID: "v1", DisplayName: "pipe-1.0"}},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{
			Name:        "pipe",
			Version:     "1.0",
			FileContent: []byte("yaml"),
		})
		if err != nil {
			t.Fatal(err)
		}
		if dp.PipelineID != "p1" {
			t.Errorf("PipelineID = %q", dp.PipelineID)
		}
	})

	t.Run("creates new pipeline and version", func(t *testing.T) {
		discoverCount := 0
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				discoverCount++
				if discoverCount <= 3 {
					return &PipelinesResponse{}, nil
				}
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "new-p", DisplayName: "pipe"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{}, nil
			},
			createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
				return &Pipeline{PipelineID: "new-p", DisplayName: name}, nil
			},
			uploadPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
				return &PipelineVersion{PipelineVersionID: "new-v"}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		dp, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{
			Name:        "pipe",
			Version:     "1.0",
			FileContent: []byte("yaml"),
		})
		if err != nil {
			t.Fatal(err)
		}
		if dp.PipelineVersionID != "new-v" {
			t.Errorf("PipelineVersionID = %q", dp.PipelineVersionID)
		}
	})

	t.Run("missing name", func(t *testing.T) {
		svc := newTestServiceWithMock(&mockPipelineClient{})
		_, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{Version: "1.0", FileContent: []byte("x")})
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("missing version", func(t *testing.T) {
		svc := newTestServiceWithMock(&mockPipelineClient{})
		_, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{Name: "pipe", FileContent: []byte("x")})
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("no file content and not found errors", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		_, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{Name: "pipe", Version: "1.0"})
		if err == nil {
			t.Error("expected error when no file content and not found")
		}
	})
}

// --- DiscoverNamedPipelines ---

func TestService_DiscoverNamedPipelines(t *testing.T) {
	t.Run("discovers multiple pipelines with version fallback", func(t *testing.T) {
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "pipeline-a"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{
						{PipelineVersionID: "v-latest", DisplayName: "pipeline-a-old"},
					},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		result, err := svc.DiscoverNamedPipelines(testCtx(), "test-ns", "2.0", map[string]string{
			"type-a": "pipeline-a",
		})
		if err != nil {
			t.Fatal(err)
		}
		if result["type-a"] == nil {
			t.Fatal("expected type-a to be discovered")
		}
		if result["type-a"].PipelineVersionID != "v-latest" {
			t.Errorf("expected fallback version, got %q", result["type-a"].PipelineVersionID)
		}
	})

	t.Run("empty namespace returns error", func(t *testing.T) {
		svc := newTestServiceWithMock(&mockPipelineClient{})
		_, err := svc.DiscoverNamedPipelines(testCtx(), "", "1.0", map[string]string{"a": "b"})
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("uses cache on second call", func(t *testing.T) {
		callCount := 0
		client := &mockPipelineClient{
			listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
				callCount++
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "pipe"}},
				}, nil
			},
			listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
				return &PipelineVersionsResponse{
					PipelineVersions: []PipelineVersion{{PipelineVersionID: "v1", DisplayName: "pipe-1.0"}},
				}, nil
			},
		}
		svc := newTestServiceWithMock(client)

		defs := map[string]string{"type": "pipe"}
		_, err := svc.DiscoverNamedPipelines(testCtx(), "test-ns", "1.0", defs)
		if err != nil {
			t.Fatal(err)
		}
		firstCount := callCount

		_, err = svc.DiscoverNamedPipelines(testCtx(), "test-ns", "1.0", defs)
		if err != nil {
			t.Fatal(err)
		}

		if callCount != firstCount {
			t.Errorf("expected cache hit, but API was called %d times after first call", callCount-firstCount)
		}
	})
}

// --- findOrCreatePipeline ---

func TestService_findOrCreatePipeline_ConflictRetry(t *testing.T) {
	attempt := 0
	client := &mockPipelineClient{
		listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
			attempt++
			if attempt >= 3 {
				return &PipelinesResponse{
					Pipelines: []Pipeline{{PipelineID: "p1", DisplayName: "pipe"}},
				}, nil
			}
			return &PipelinesResponse{}, nil
		},
		createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
			return nil, fmt.Errorf("%w: already exists", k8s.ErrConflict)
		},
	}
	svc := newTestServiceWithMock(client)

	id, err := svc.findOrCreatePipeline(testCtx(), "https://ds-pipeline.svc", "pipe")
	if err != nil {
		t.Fatal(err)
	}
	if id != "p1" {
		t.Errorf("expected p1, got %q", id)
	}
}

// --- Service pass-through method tests ---

func TestService_ListPipelines(t *testing.T) {
	client := &mockPipelineClient{
		listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
			return &PipelinesResponse{Pipelines: []Pipeline{{PipelineID: "p1"}}}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	resp, err := svc.ListPipelines(testCtx(), "test-ns", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Pipelines) != 1 {
		t.Errorf("expected 1 pipeline, got %d", len(resp.Pipelines))
	}
}

func TestService_ListPipelines_Error(t *testing.T) {
	client := &mockPipelineClient{
		listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.ListPipelines(testCtx(), "test-ns", "")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetPipelineVersion(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
			return &PipelineVersion{PipelineVersionID: "v1"}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	v, err := svc.GetPipelineVersion(testCtx(), "test-ns", "p1", "v1")
	if err != nil {
		t.Fatal(err)
	}
	if v.PipelineVersionID != "v1" {
		t.Errorf("VersionID = %q", v.PipelineVersionID)
	}
}

func TestService_GetPipelineVersion_Error(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionID string) (*PipelineVersion, error) {
			return nil, fmt.Errorf("not found")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.GetPipelineVersion(testCtx(), "test-ns", "p1", "v1")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_ListPipelineVersions(t *testing.T) {
	client := &mockPipelineClient{
		listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
			return &PipelineVersionsResponse{PipelineVersions: []PipelineVersion{{PipelineVersionID: "v1"}}}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	resp, err := svc.ListPipelineVersions(testCtx(), "test-ns", "p1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.PipelineVersions) != 1 {
		t.Errorf("expected 1 version, got %d", len(resp.PipelineVersions))
	}
}

func TestService_ListPipelineVersions_Error(t *testing.T) {
	client := &mockPipelineClient{
		listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.ListPipelineVersions(testCtx(), "test-ns", "p1")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_CreatePipeline(t *testing.T) {
	client := &mockPipelineClient{
		createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
			return &Pipeline{PipelineID: "new-p"}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	p, err := svc.CreatePipeline(testCtx(), "test-ns", "my-pipe")
	if err != nil {
		t.Fatal(err)
	}
	if p.PipelineID != "new-p" {
		t.Errorf("PipelineID = %q", p.PipelineID)
	}
}

func TestService_CreatePipeline_Error(t *testing.T) {
	client := &mockPipelineClient{
		createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
			return nil, fmt.Errorf("conflict")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.CreatePipeline(testCtx(), "test-ns", "my-pipe")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_UploadPipelineVersion(t *testing.T) {
	client := &mockPipelineClient{
		uploadPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
			return &PipelineVersion{PipelineVersionID: "v-new"}, nil
		},
	}
	svc := newTestServiceWithMock(client)

	v, err := svc.UploadPipelineVersion(testCtx(), "test-ns", "p1", "v1.0", []byte("yaml"))
	if err != nil {
		t.Fatal(err)
	}
	if v.PipelineVersionID != "v-new" {
		t.Errorf("VersionID = %q", v.PipelineVersionID)
	}
}

func TestService_UploadPipelineVersion_Error(t *testing.T) {
	client := &mockPipelineClient{
		uploadPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
			return nil, fmt.Errorf("upload failed")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.UploadPipelineVersion(testCtx(), "test-ns", "p1", "v1.0", []byte("yaml"))
	if err == nil {
		t.Error("expected error")
	}
}

// --- ensurePipelineAndVersion conflict recovery edge case ---

func TestService_EnsurePipeline_UploadConflictRediscoverFail(t *testing.T) {
	client := &mockPipelineClient{
		listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
			return &PipelinesResponse{}, nil
		},
		listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
			return &PipelineVersionsResponse{}, nil
		},
		createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
			return &Pipeline{PipelineID: "p1"}, nil
		},
		uploadPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
			return nil, fmt.Errorf("%w: version exists", k8s.ErrConflict)
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{
		Name:        "pipe",
		Version:     "1.0",
		FileContent: []byte("yaml"),
	})
	if err == nil {
		t.Error("expected error when conflict + rediscover finds nothing")
	}
}

func TestService_EnsurePipeline_UploadNonConflictError(t *testing.T) {
	client := &mockPipelineClient{
		listPipelinesFn: func(ctx context.Context, baseURL string, filter string) (*PipelinesResponse, error) {
			return &PipelinesResponse{}, nil
		},
		listPipelineVersionsFn: func(ctx context.Context, baseURL string, pipelineID string) (*PipelineVersionsResponse, error) {
			return &PipelineVersionsResponse{}, nil
		},
		createPipelineFn: func(ctx context.Context, baseURL string, name string) (*Pipeline, error) {
			return &Pipeline{PipelineID: "p1"}, nil
		},
		uploadPipelineVersionFn: func(ctx context.Context, baseURL string, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
			return nil, fmt.Errorf("server error")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.EnsurePipeline(testCtx(), "test-ns", PipelineDefinition{
		Name:        "pipe",
		Version:     "1.0",
		FileContent: []byte("yaml"),
	})
	if err == nil {
		t.Error("expected error")
	}
}

// --- RetryRun / DeleteRun additional error paths ---

func TestService_RetryRun_RunNotFound(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return nil, fmt.Errorf("%w: missing", ErrPipelineNotFound)
		},
	}
	svc := newTestServiceWithMock(client)

	err := svc.RetryRun(testCtx(), "test-ns", "r1")
	if !errors.Is(err, ErrPipelineRunNotFound) {
		t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
	}
}

func TestService_DeleteRun_RunNotFound(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return nil, fmt.Errorf("%w: missing", ErrPipelineNotFound)
		},
	}
	svc := newTestServiceWithMock(client)

	err := svc.DeleteRun(testCtx(), "test-ns", "r1")
	if !errors.Is(err, ErrPipelineRunNotFound) {
		t.Errorf("expected ErrPipelineRunNotFound, got %v", err)
	}
}

func TestService_RetryRun_ClientError(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return &PipelineRun{RunID: "r1", State: "FAILED"}, nil
		},
		retryRunFn: func(ctx context.Context, baseURL string, runID string) error {
			return fmt.Errorf("server error")
		},
	}
	svc := newTestServiceWithMock(client)

	err := svc.RetryRun(testCtx(), "test-ns", "r1")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_DeleteRun_ClientError(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return &PipelineRun{RunID: "r1", State: "SUCCEEDED"}, nil
		},
		deleteRunFn: func(ctx context.Context, baseURL string, runID string) error {
			return fmt.Errorf("server error")
		},
	}
	svc := newTestServiceWithMock(client)

	err := svc.DeleteRun(testCtx(), "test-ns", "r1")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_CreatePipelineRun_Error(t *testing.T) {
	client := &mockPipelineClient{
		createPipelineRunFn: func(ctx context.Context, baseURL string, input *CreatePipelineRunInput) (*PipelineRun, error) {
			return nil, fmt.Errorf("server error")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.CreatePipelineRun(testCtx(), "test-ns", &CreatePipelineRunInput{DisplayName: "test"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_GetPipelineRun_Error(t *testing.T) {
	client := &mockPipelineClient{
		getPipelineRunFn: func(ctx context.Context, baseURL string, runID string) (*PipelineRun, error) {
			return nil, fmt.Errorf("not found")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.GetPipelineRun(testCtx(), "test-ns", "r1")
	if err == nil {
		t.Error("expected error")
	}
}

func TestService_ListPipelineRuns_Error(t *testing.T) {
	client := &mockPipelineClient{
		listPipelineRunsFn: func(ctx context.Context, baseURL string, params *ListRunsParams) (*PipelineRunResponse, error) {
			return nil, fmt.Errorf("timeout")
		},
	}
	svc := newTestServiceWithMock(client)

	_, err := svc.ListPipelineRuns(testCtx(), "test-ns", nil)
	if err == nil {
		t.Error("expected error")
	}
}
