package api_test

// This file contains API-level end-to-end ("workflow") tests for the AutoML BFF.
//
// Unlike the OpenAPI contract tests (packages/automl/contract-tests), which validate
// that individual requests match the documented request/response shape, these tests
// boot the real App (full router + middleware chain) in-process against the stateful
// fakes and drive a single resource through a multi-step lifecycle, asserting on the
// resulting state and side effects after each step (e.g. a created run is visible via
// GET and in the LIST results; a deleted run is gone from both). This is the kind of
// business-behavior coverage a per-request contract test cannot express.
//
// Keep this suite small and focused on critical paths (create/get/list/terminate/
// delete). Add new lifecycle scenarios as additional top-level Test functions using
// newE2EServer, rather than growing this file's existing test.

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
	"time"

	"github.com/opendatahub-io/automl-library/bff/internal/api"
	"github.com/opendatahub-io/automl-library/bff/internal/config"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

const e2eNamespace = "my-project"

// e2eHTTPClient is used for all requests issued by this suite. A bounded
// timeout ensures a blocked/deadlocked handler fails a test quickly with a
// clear "context deadline exceeded" error instead of hanging until the
// package-level go test timeout, which would obscure which request stalled.
var e2eHTTPClient = &http.Client{Timeout: 30 * time.Second}

// newE2EServer boots a real App wired entirely to stateful fakes (no live cluster,
// no external processes) and returns an httptest.Server exposing app.Routes().
// AuthMethodDisabled is used so requests need no identity headers — the fake
// identity extractor always returns a valid, fully-privileged identity, and
// RequireAccessToService short-circuits its SSAR check for this auth method.
func newE2EServer(t *testing.T) string {
	t.Helper()

	cfg := config.EnvConfig{
		MockK8sClient:            true,
		MockS3Client:             true,
		MockPipelineServerClient: true,
		MockModelRegistryClient:  true,
		DevMode:                  true,
		DeploymentMode:           config.DeploymentModeStandalone,
		AuthMethod:               config.AuthMethodDisabled,
		StaticAssetsDir:          t.TempDir(),
		LogLevel:                 slog.LevelError,
		// Must match the fake pipelines client's discoverable pipeline display
		// names (packages/automl/bff/internal/fake/pipelines.go) so pipeline-run
		// discovery succeeds — these mirror cmd/main.go's flag defaults.
		AutoMLTabularPipelineNamePrefix:    "autogluon-tabular-training-pipeline",
		AutoMLTimeSeriesPipelineNamePrefix: "autogluon-timeseries-training-pipeline",
	}

	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	app, err := api.NewApp(cfg, logger)
	if err != nil {
		t.Fatalf("failed to construct app: %v", err)
	}

	srv := httptest.NewServer(app.Routes())
	t.Cleanup(srv.Close)
	return srv.URL
}

// e2eResponse captures a decoded HTTP response for assertions.
type e2eResponse struct {
	status int
	body   []byte
}

func e2eRequest(t *testing.T, method, url string, body any) e2eResponse {
	t.Helper()

	var reader io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			t.Fatalf("failed to marshal request body: %v", err)
		}
		reader = bytes.NewReader(b)
	}

	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatalf("failed to build request: %v", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	resp, err := e2eHTTPClient.Do(req)
	if err != nil {
		t.Fatalf("request %s %s failed: %v", method, url, err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}

	return e2eResponse{status: resp.StatusCode, body: data}
}

func decodeInto(t *testing.T, resp e2eResponse, dst any) {
	t.Helper()
	if err := json.Unmarshal(resp.body, dst); err != nil {
		t.Fatalf("failed to decode response body %q: %v", resp.body, err)
	}
}

// TestPipelineRunLifecycle drives a single AutoML pipeline run through its full
// critical-path lifecycle — create, get, list, terminate (state transition), delete —
// against the real handler stack + stateful fakes, asserting on state and side effects
// at each step rather than just response shape.
func TestPipelineRunLifecycle(t *testing.T) {
	baseURL := newE2EServer(t)
	runsURL := baseURL + "/api/v1/pipeline-runs?namespace=" + e2eNamespace

	var runID string

	t.Run("create returns a new PENDING run", func(t *testing.T) {
		resp := e2eRequest(t, http.MethodPost, runsURL, map[string]any{
			"display_name":           "e2e-lifecycle-run",
			"train_data_secret_name": "data-connection",
			"train_data_bucket_name": "s3-bucket",
			"train_data_file_key":    "automl input data/TitanicFullMF.csv",
			"label_column":           "target",
			"task_type":              "binary",
		})
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}

		var created api.CreatePipelineRunEnvelope
		decodeInto(t, resp, &created)

		if created.Data.RunID == "" {
			t.Fatal("expected a non-empty run_id in the create response")
		}
		if created.Data.DisplayName != "e2e-lifecycle-run" {
			t.Errorf("display_name = %q, want %q", created.Data.DisplayName, "e2e-lifecycle-run")
		}
		if created.Data.State != "PENDING" {
			t.Errorf("state = %q, want PENDING immediately after create", created.Data.State)
		}

		runID = created.Data.RunID
	})

	t.Run("get reflects the created run's persisted state", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}

		var got api.PipelineRunEnvelope
		decodeInto(t, resp, &got)

		if got.Data.RunID != runID {
			t.Errorf("run_id = %q, want %q", got.Data.RunID, runID)
		}
		if got.Data.DisplayName != "e2e-lifecycle-run" {
			t.Errorf("display_name = %q, want %q", got.Data.DisplayName, "e2e-lifecycle-run")
		}
	})

	t.Run("list includes the created run", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, runsURL, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}

		var list api.PipelineRunsEnvelope
		decodeInto(t, resp, &list)

		if !containsRunID(list.Data.Runs, runID) {
			t.Errorf("expected list to contain run %q, got %d runs", runID, len(list.Data.Runs))
		}
	})

	t.Run("terminate transitions the run to a terminal FAILED state", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		terminateResp := e2eRequest(t, http.MethodPost, baseURL+"/api/v1/pipeline-runs/"+runID+"/terminate?namespace="+e2eNamespace, map[string]any{})
		if terminateResp.status != http.StatusOK {
			t.Fatalf("expected 200 from terminate, got %d: %s", terminateResp.status, terminateResp.body)
		}

		// The fake pipelines client transitions CANCELING -> FAILED asynchronously
		// (~2s). Poll GET until the state change is observed rather than sleeping
		// blindly, keeping the test fast while still exercising real async behavior.
		state := pollForState(t, baseURL, runID, "FAILED", 5*time.Second)
		if state != "FAILED" {
			t.Fatalf("run did not reach FAILED state in time, last observed state: %q", state)
		}
	})

	t.Run("delete removes the run", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodDelete, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200 from delete, got %d: %s", resp.status, resp.body)
		}
	})

	t.Run("get after delete returns 404", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusNotFound {
			t.Fatalf("expected 404 after delete, got %d: %s", resp.status, resp.body)
		}
	})

	t.Run("list no longer contains the deleted run", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, runsURL, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}

		var list api.PipelineRunsEnvelope
		decodeInto(t, resp, &list)

		if containsRunID(list.Data.Runs, runID) {
			t.Errorf("expected list to no longer contain deleted run %q", runID)
		}
	})
}

func containsRunID(runs []models.PipelineRun, runID string) bool {
	for _, r := range runs {
		if r.RunID == runID {
			return true
		}
	}
	return false
}

// pollForState polls GET /pipeline-runs/:runId until the run reaches wantState or the
// timeout elapses, returning the last observed state.
func pollForState(t *testing.T, baseURL, runID, wantState string, timeout time.Duration) string {
	t.Helper()

	deadline := time.Now().Add(timeout)
	var lastState string
	for time.Now().Before(deadline) {
		resp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("unexpected status while polling run state: %d: %s", resp.status, resp.body)
		}
		var got api.PipelineRunEnvelope
		decodeInto(t, resp, &got)
		lastState = got.Data.State
		if lastState == wantState {
			return lastState
		}
		time.Sleep(250 * time.Millisecond)
	}
	return lastState
}

// TestPipelineRunRetryToSuccess covers the one state-machine transition
// TestPipelineRunLifecycle doesn't: retrying a FAILED run and letting it
// progress all the way through the fake's natural PENDING -> RUNNING ->
// SUCCEEDED simulation, confirming run_details is populated for a completed
// run, then deleting it. Runtime is dominated by the fake's ~15s progression
// simulation (5s to RUNNING, +10s to SUCCEEDED).
func TestPipelineRunRetryToSuccess(t *testing.T) {
	baseURL := newE2EServer(t)
	runsURL := baseURL + "/api/v1/pipeline-runs?namespace=" + e2eNamespace

	var runID string

	t.Run("create a run to retry", func(t *testing.T) {
		resp := e2eRequest(t, http.MethodPost, runsURL, map[string]any{
			"display_name":           "e2e-retry-run",
			"train_data_secret_name": "data-connection",
			"train_data_bucket_name": "s3-bucket",
			"train_data_file_key":    "automl input data/TitanicFullMF.csv",
			"label_column":           "target",
			"task_type":              "binary",
		})
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}
		var created api.CreatePipelineRunEnvelope
		decodeInto(t, resp, &created)
		if created.Data.RunID == "" {
			t.Fatal("expected a non-empty run_id in the create response")
		}
		runID = created.Data.RunID
	})

	t.Run("terminate to reach a retryable FAILED state", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		terminateResp := e2eRequest(t, http.MethodPost, baseURL+"/api/v1/pipeline-runs/"+runID+"/terminate?namespace="+e2eNamespace, map[string]any{})
		if terminateResp.status != http.StatusOK {
			t.Fatalf("expected 200 from terminate, got %d: %s", terminateResp.status, terminateResp.body)
		}
		state := pollForState(t, baseURL, runID, "FAILED", 5*time.Second)
		if state != "FAILED" {
			t.Fatalf("run did not reach FAILED state in time, last observed state: %q", state)
		}
	})

	t.Run("retry resets the run and it progresses to SUCCEEDED", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		retryResp := e2eRequest(t, http.MethodPost, baseURL+"/api/v1/pipeline-runs/"+runID+"/retry?namespace="+e2eNamespace, map[string]any{})
		if retryResp.status != http.StatusOK {
			t.Fatalf("expected 200 from retry, got %d: %s", retryResp.status, retryResp.body)
		}

		// Confirm the retry actually reset state to PENDING before waiting for
		// the fake's async re-progression, rather than only checking the final
		// SUCCEEDED state (which could also be reached by a stale prior run).
		getResp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		var afterRetry api.PipelineRunEnvelope
		decodeInto(t, getResp, &afterRetry)
		if afterRetry.Data.State != "PENDING" {
			t.Fatalf("state immediately after retry = %q, want PENDING", afterRetry.Data.State)
		}

		// The fake needs ~15s to progress PENDING -> RUNNING -> SUCCEEDED. Allow
		// generous slack for loaded CI runners; pollForState returns as soon as
		// the state matches, so a large timeout costs nothing on a healthy run.
		state := pollForState(t, baseURL, runID, "SUCCEEDED", 45*time.Second)
		if state != "SUCCEEDED" {
			t.Fatalf("run did not reach SUCCEEDED state after retry, last observed state: %q", state)
		}
	})

	t.Run("run_details reflects completed tasks after success", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}
		var got api.PipelineRunEnvelope
		decodeInto(t, resp, &got)

		if got.Data.RunDetails == nil || len(got.Data.RunDetails.TaskDetails) == 0 {
			t.Fatal("expected run_details.task_details to be populated for a SUCCEEDED run")
		}
		for _, td := range got.Data.RunDetails.TaskDetails {
			if td.State != "SUCCEEDED" {
				t.Errorf("task %q state = %q, want SUCCEEDED", td.DisplayName, td.State)
			}
		}
	})

	t.Run("delete the succeeded run", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodDelete, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200 from delete, got %d: %s", resp.status, resp.body)
		}
	})

	t.Run("get after delete returns 404", func(t *testing.T) {
		if runID == "" {
			t.Fatal("previous subtest did not produce a run ID")
		}

		resp := e2eRequest(t, http.MethodGet, baseURL+"/api/v1/pipeline-runs/"+runID+"?namespace="+e2eNamespace, nil)
		if resp.status != http.StatusNotFound {
			t.Fatalf("expected 404 after delete, got %d: %s", resp.status, resp.body)
		}
	})
}

// e2eUploadFile performs a multipart/form-data POST of content to the S3 upload
// endpoint using a "file" part named filename. The automl S3 fake persists
// uploads to a gitignored, self-cleaning directory on disk (see
// internal/fake/s3.go), so this exercises a genuine, real state-persistence
// workflow rather than a canned response.
func e2eUploadFile(t *testing.T, baseURL, key, filename, content string) e2eResponse {
	t.Helper()

	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)
	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		t.Fatalf("failed to create multipart file part: %v", err)
	}
	if _, err := part.Write([]byte(content)); err != nil {
		t.Fatalf("failed to write multipart file content: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("failed to close multipart writer: %v", err)
	}

	uploadURL := baseURL + "/api/v1/s3/files/" + url.PathEscape(key) +
		"?namespace=" + e2eNamespace + "&secretName=data-connection&bucket=s3-bucket"
	req, err := http.NewRequest(http.MethodPost, uploadURL, &buf)
	if err != nil {
		t.Fatalf("failed to build upload request: %v", err)
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := e2eHTTPClient.Do(req)
	if err != nil {
		t.Fatalf("upload request failed: %v", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read upload response body: %v", err)
	}
	return e2eResponse{status: resp.StatusCode, body: data}
}

// TestS3FileUploadListDownloadRoundTrip verifies a full state-persistence
// workflow against the filesystem-backed S3 fake: an uploaded file is
// discoverable via LIST with the correct size and downloadable with byte-exact
// content — behavior a per-request contract test cannot express, since it
// requires correlating three separate calls against the same piece of state.
func TestS3FileUploadListDownloadRoundTrip(t *testing.T) {
	baseURL := newE2EServer(t)

	// A unique key avoids collisions with seed data or other test runs and
	// proves the listed/downloaded content is what *this* test wrote, not
	// pre-existing seed data.
	key := fmt.Sprintf("e2e-roundtrip-upload-%d.csv", time.Now().UnixNano())
	content := "col1,col2\ne2e,roundtrip\n"

	t.Run("upload creates a new object", func(t *testing.T) {
		resp := e2eUploadFile(t, baseURL, key, key, content)
		if resp.status != http.StatusCreated {
			t.Fatalf("expected 201, got %d: %s", resp.status, resp.body)
		}
		var uploaded struct {
			Uploaded bool   `json:"uploaded"`
			Key      string `json:"key"`
		}
		decodeInto(t, resp, &uploaded)
		if !uploaded.Uploaded {
			t.Error("expected uploaded=true")
		}
		if uploaded.Key != key {
			t.Errorf("resolved key = %q, want %q (a fresh key should not collide)", uploaded.Key, key)
		}
	})

	t.Run("list includes the uploaded file with the correct size", func(t *testing.T) {
		resp := e2eRequest(t, http.MethodGet,
			baseURL+"/api/v1/s3/files?namespace="+e2eNamespace+"&secretName=data-connection&bucket=s3-bucket", nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}

		var list api.S3FilesEnvelope
		decodeInto(t, resp, &list)

		var found bool
		for _, obj := range list.Data.Contents {
			if obj.Key != key {
				continue
			}
			found = true
			if obj.Size != int64(len(content)) {
				t.Errorf("listed size = %d, want %d", obj.Size, len(content))
			}
		}
		if !found {
			t.Errorf("expected uploaded key %q to appear in file listing", key)
		}
	})

	t.Run("download returns the exact uploaded bytes", func(t *testing.T) {
		resp := e2eRequest(t, http.MethodGet,
			baseURL+"/api/v1/s3/files/"+url.PathEscape(key)+"?namespace="+e2eNamespace+"&secretName=data-connection&bucket=s3-bucket", nil)
		if resp.status != http.StatusOK {
			t.Fatalf("expected 200, got %d: %s", resp.status, resp.body)
		}
		if string(resp.body) != content {
			t.Errorf("downloaded content = %q, want %q", resp.body, content)
		}
	})
}
