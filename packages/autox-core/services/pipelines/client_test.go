package pipelines

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

func newTestServer(handler http.HandlerFunc) (*httptest.Server, Client) {
	ts := httptest.NewServer(handler)
	c := NewClient(ts.Client())
	return ts, c
}

func jsonResponse(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(v)
}

// --- CreatePipelineRun ---

func TestClient_CreatePipelineRun(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost || !strings.HasSuffix(r.URL.Path, "/apis/v2beta1/runs") {
				t.Errorf("unexpected %s %s", r.Method, r.URL.Path)
			}
			if r.Header.Get("Content-Type") != "application/json" {
				t.Error("expected application/json content type")
			}
			jsonResponse(w, PipelineRun{RunID: "run-1", DisplayName: "test"})
		})
		defer ts.Close()

		run, err := c.CreatePipelineRun(context.Background(), ts.URL, &CreatePipelineRunInput{DisplayName: "test"})
		if err != nil {
			t.Fatal(err)
		}
		if run.RunID != "run-1" {
			t.Errorf("RunID = %q", run.RunID)
		}
	})

	t.Run("server error", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "internal error", http.StatusInternalServerError)
		})
		defer ts.Close()

		_, err := c.CreatePipelineRun(context.Background(), ts.URL, &CreatePipelineRunInput{})
		if err == nil {
			t.Error("expected error")
		}
	})
}

// --- GetPipelineRun ---

func TestClient_GetPipelineRun(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.URL.Path, "/runs/run-1") {
				t.Errorf("unexpected path: %s", r.URL.Path)
			}
			jsonResponse(w, PipelineRun{RunID: "run-1", State: "RUNNING"})
		})
		defer ts.Close()

		run, err := c.GetPipelineRun(context.Background(), ts.URL, "run-1")
		if err != nil {
			t.Fatal(err)
		}
		if run.State != "RUNNING" {
			t.Errorf("State = %q", run.State)
		}
	})

	t.Run("empty runID", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			t.Fatal("should not be called")
		})
		defer ts.Close()

		_, err := c.GetPipelineRun(context.Background(), ts.URL, "")
		if err == nil || !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("404 maps to ErrPipelineNotFound", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "not found", http.StatusNotFound)
		})
		defer ts.Close()

		_, err := c.GetPipelineRun(context.Background(), ts.URL, "missing")
		if err == nil || !errors.Is(err, ErrPipelineNotFound) {
			t.Errorf("expected ErrPipelineNotFound, got %v", err)
		}
	})
}

// --- ListPipelineRuns ---

func TestClient_ListPipelineRuns(t *testing.T) {
	ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		q := r.URL.Query()
		if q.Get("page_size") != "10" || q.Get("sort_by") != "created_at desc" {
			t.Errorf("unexpected query: %v", q)
		}
		jsonResponse(w, PipelineRunResponse{
			Runs:      []PipelineRun{{RunID: "r1"}},
			TotalSize: 1,
		})
	})
	defer ts.Close()

	resp, err := c.ListPipelineRuns(context.Background(), ts.URL, &ListRunsParams{
		PageSize: 10,
		SortBy:   "created_at desc",
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Runs) != 1 || resp.TotalSize != 1 {
		t.Errorf("unexpected response: %+v", resp)
	}
}

// --- TerminateRun / RetryRun / DeleteRun ---

func TestClient_RunActions(t *testing.T) {
	for _, tt := range []struct {
		name   string
		action func(c Client, url string) error
		method string
		path   string
	}{
		{"terminate", func(c Client, url string) error { return c.TerminateRun(context.Background(), url, "r1") }, http.MethodPost, "/runs/r1:terminate"},
		{"retry", func(c Client, url string) error { return c.RetryRun(context.Background(), url, "r1") }, http.MethodPost, "/runs/r1:retry"},
		{"delete", func(c Client, url string) error { return c.DeleteRun(context.Background(), url, "r1") }, http.MethodDelete, "/runs/r1"},
	} {
		t.Run(tt.name+" success", func(t *testing.T) {
			ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
				if r.Method != tt.method {
					t.Errorf("method = %s, want %s", r.Method, tt.method)
				}
				if !strings.HasSuffix(r.URL.Path, tt.path) {
					t.Errorf("path = %s, want suffix %s", r.URL.Path, tt.path)
				}
				w.WriteHeader(http.StatusOK)
			})
			defer ts.Close()

			if err := tt.action(c, ts.URL); err != nil {
				t.Fatal(err)
			}
		})

		t.Run(tt.name+" empty runID", func(t *testing.T) {
			ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) { t.Fatal("should not call") })
			defer ts.Close()

			emptyAction := func(c Client, url string) error {
				switch tt.name {
				case "terminate":
					return c.TerminateRun(context.Background(), url, "")
				case "retry":
					return c.RetryRun(context.Background(), url, "")
				default:
					return c.DeleteRun(context.Background(), url, "")
				}
			}
			if err := emptyAction(c, ts.URL); err == nil || !errors.Is(err, ErrInvalidInput) {
				t.Errorf("expected ErrInvalidInput, got %v", err)
			}
		})
	}
}

// --- ListPipelines (pagination) ---

func TestClient_ListPipelines(t *testing.T) {
	t.Run("auto-paginates", func(t *testing.T) {
		page := 0
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			page++
			resp := PipelinesResponse{
				Pipelines: []Pipeline{{PipelineID: fmt.Sprintf("p%d", page)}},
				TotalSize: 2,
			}
			if page == 1 {
				resp.NextPageToken = "page2"
			}
			jsonResponse(w, resp)
		})
		defer ts.Close()

		resp, err := c.ListPipelines(context.Background(), ts.URL, "")
		if err != nil {
			t.Fatal(err)
		}
		if len(resp.Pipelines) != 2 {
			t.Errorf("expected 2 pipelines across pages, got %d", len(resp.Pipelines))
		}
	})

	t.Run("filter passed in query", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			if r.URL.Query().Get("filter") == "" {
				t.Error("expected filter in query")
			}
			jsonResponse(w, PipelinesResponse{})
		})
		defer ts.Close()

		_, err := c.ListPipelines(context.Background(), ts.URL, `{"predicates":[]}`)
		if err != nil {
			t.Fatal(err)
		}
	})
}

// --- GetPipelineVersion ---

func TestClient_GetPipelineVersion(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			jsonResponse(w, PipelineVersion{PipelineVersionID: "v1", PipelineID: "p1"})
		})
		defer ts.Close()

		v, err := c.GetPipelineVersion(context.Background(), ts.URL, "p1", "v1")
		if err != nil {
			t.Fatal(err)
		}
		if v.PipelineVersionID != "v1" {
			t.Errorf("VersionID = %q", v.PipelineVersionID)
		}
	})

	t.Run("empty IDs", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) { t.Fatal("should not call") })
		defer ts.Close()

		_, err := c.GetPipelineVersion(context.Background(), ts.URL, "", "v1")
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
		_, err = c.GetPipelineVersion(context.Background(), ts.URL, "p1", "")
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})
}

// --- ListPipelineVersions ---

func TestClient_ListPipelineVersions(t *testing.T) {
	ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
		if !strings.Contains(r.URL.Path, "/pipelines/p1/versions") {
			t.Errorf("unexpected path: %s", r.URL.Path)
		}
		jsonResponse(w, PipelineVersionsResponse{
			PipelineVersions: []PipelineVersion{{PipelineVersionID: "v1"}},
		})
	})
	defer ts.Close()

	resp, err := c.ListPipelineVersions(context.Background(), ts.URL, "p1")
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.PipelineVersions) != 1 {
		t.Errorf("expected 1 version, got %d", len(resp.PipelineVersions))
	}
}

// --- CreatePipeline ---

func TestClient_CreatePipeline(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			var body map[string]string
			json.NewDecoder(r.Body).Decode(&body)
			if body["display_name"] != "my-pipe" {
				t.Errorf("display_name = %q", body["display_name"])
			}
			jsonResponse(w, Pipeline{PipelineID: "p1", DisplayName: "my-pipe"})
		})
		defer ts.Close()

		p, err := c.CreatePipeline(context.Background(), ts.URL, "my-pipe")
		if err != nil {
			t.Fatal(err)
		}
		if p.PipelineID != "p1" {
			t.Errorf("PipelineID = %q", p.PipelineID)
		}
	})

	t.Run("empty name", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) { t.Fatal("should not call") })
		defer ts.Close()

		_, err := c.CreatePipeline(context.Background(), ts.URL, "")
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})

	t.Run("409 maps to ErrConflict", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "conflict", http.StatusConflict)
		})
		defer ts.Close()

		_, err := c.CreatePipeline(context.Background(), ts.URL, "dupe")
		if !errors.Is(err, k8s.ErrConflict) {
			t.Errorf("expected ErrConflict, got %v", err)
		}
	})
}

// --- UploadPipelineVersion ---

func TestClient_UploadPipelineVersion(t *testing.T) {
	t.Run("sends multipart form", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			ct := r.Header.Get("Content-Type")
			if !strings.HasPrefix(ct, "multipart/form-data") {
				t.Errorf("Content-Type = %q, want multipart", ct)
			}

			if err := r.ParseMultipartForm(10 << 20); err != nil {
				t.Fatal(err)
			}
			if r.FormValue("name") != "v1.0" {
				t.Errorf("name = %q", r.FormValue("name"))
			}
			if r.FormValue("pipelineid") != "p1" {
				t.Errorf("pipelineid = %q", r.FormValue("pipelineid"))
			}

			file, _, err := r.FormFile("uploadfile")
			if err != nil {
				t.Fatal(err)
			}
			content, _ := io.ReadAll(file)
			if string(content) != "pipeline-yaml-content" {
				t.Errorf("file content = %q", string(content))
			}

			jsonResponse(w, PipelineVersion{PipelineVersionID: "ver-1"})
		})
		defer ts.Close()

		v, err := c.UploadPipelineVersion(context.Background(), ts.URL, "p1", "v1.0", []byte("pipeline-yaml-content"))
		if err != nil {
			t.Fatal(err)
		}
		if v.PipelineVersionID != "ver-1" {
			t.Errorf("VersionID = %q", v.PipelineVersionID)
		}
	})

	t.Run("empty pipelineID", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) { t.Fatal("should not call") })
		defer ts.Close()

		_, err := c.UploadPipelineVersion(context.Background(), ts.URL, "", "v1", []byte("x"))
		if !errors.Is(err, ErrInvalidInput) {
			t.Errorf("expected ErrInvalidInput, got %v", err)
		}
	})
}

// --- readhttpError ---

func TestReadHTTPError(t *testing.T) {
	t.Run("404 maps to ErrPipelineNotFound", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "not found", http.StatusNotFound)
		})
		defer ts.Close()

		_, err := c.GetPipelineRun(context.Background(), ts.URL, "missing")
		if !errors.Is(err, ErrPipelineNotFound) {
			t.Errorf("expected ErrPipelineNotFound, got %v", err)
		}
	})

	t.Run("409 maps to ErrConflict", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "conflict", http.StatusConflict)
		})
		defer ts.Close()

		_, err := c.CreatePipeline(context.Background(), ts.URL, "dup")
		if !errors.Is(err, k8s.ErrConflict) {
			t.Errorf("expected ErrConflict, got %v", err)
		}
	})

	t.Run("500 returns httpError", func(t *testing.T) {
		ts, c := newTestServer(func(w http.ResponseWriter, r *http.Request) {
			http.Error(w, "internal server error", http.StatusInternalServerError)
		})
		defer ts.Close()

		_, err := c.GetPipelineRun(context.Background(), ts.URL, "r1")
		if err == nil {
			t.Fatal("expected error")
		}
		var he *httpError
		if !errors.As(err, &he) {
			t.Errorf("expected *httpError, got %T", err)
		}
		if he.StatusCode != 500 {
			t.Errorf("StatusCode = %d", he.StatusCode)
		}
	})
}
