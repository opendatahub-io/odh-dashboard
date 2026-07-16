package fake

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	plsvc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
)

const (
	seedRunID      = "e78c5f2a-5726-4e1c-bcb6-60434e77e453"
	pipelinePrefix = "documents-rag-optimization-pipeline"
)

// fakePipelineSpec includes a publish-component-stage-map task so the frontend
// activates the stage-map topology path. Component IDs in the stage map
// (e.g. "test_data_loader") map to task IDs via componentIdToTaskId() which
// replaces "_" with "-" (e.g. "test-data-loader").
var fakePipelineSpec = json.RawMessage(`{
  "root": {
    "dag": {
      "tasks": {
        "publish-component-stage-map": {
          "taskInfo": {"name": "publish-component-stage-map"},
          "dependentTasks": [],
          "componentRef": {"name": "comp-publish-component-stage-map"}
        },
        "test-data-loader": {
          "taskInfo": {"name": "test-data-loader"},
          "dependentTasks": ["publish-component-stage-map"],
          "componentRef": {"name": "comp-test-data-loader"}
        },
        "documents-discovery": {
          "taskInfo": {"name": "documents-discovery"},
          "dependentTasks": ["test-data-loader"],
          "componentRef": {"name": "comp-documents-discovery"}
        },
        "text-extraction": {
          "taskInfo": {"name": "text-extraction"},
          "dependentTasks": ["documents-discovery"],
          "componentRef": {"name": "comp-text-extraction"}
        },
        "search-space-preparation": {
          "taskInfo": {"name": "search-space-preparation"},
          "dependentTasks": ["test-data-loader", "text-extraction"],
          "componentRef": {"name": "comp-search-space-preparation"}
        },
        "rag-templates-optimization": {
          "taskInfo": {"name": "rag-templates-optimization"},
          "dependentTasks": ["search-space-preparation", "test-data-loader", "text-extraction"],
          "componentRef": {"name": "comp-rag-templates-optimization"}
        }
      }
    }
  }
}`)

const (
	ragPipelineID        = "e7eda8ed-d10c-4ed1-9db7-fef992cdd7a3"
	ragPipelineVersionID = "59534d80-7597-4abe-8eda-f33369cd22d7"
	defaultExperimentID  = "5942a476-a034-4fcb-9f87-4da694115f50"
)

// PipelinesClient is a stateful fake implementation of pipelines.Client.
type PipelinesClient struct {
	mu   sync.Mutex
	runs map[string]*plsvc.PipelineRun
}

var _ plsvc.Client = (*PipelinesClient)(nil)

func NewPipelinesClient() *PipelinesClient {
	c := &PipelinesClient{runs: make(map[string]*plsvc.PipelineRun)}
	c.seedRuns()
	return c
}

func (c *PipelinesClient) CreatePipelineRun(_ context.Context, _ string, input *plsvc.CreatePipelineRunInput) (*plsvc.PipelineRun, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now().UTC().Format(time.RFC3339)
	runID := uuid.New().String()

	run := &plsvc.PipelineRun{
		RunID:                    runID,
		DisplayName:              input.DisplayName,
		Description:              input.Description,
		ExperimentID:             defaultExperimentID,
		PipelineVersionReference: input.PipelineVersionReference,
		RuntimeConfig:            input.RuntimeConfig,
		State:                    "PENDING",
		StorageState:             "AVAILABLE",
		ServiceAccount:           "pipeline-runner-dspa",
		CreatedAt:                now,
		ScheduledAt:              now,
		FinishedAt:               "1970-01-01T00:00:00Z",
		StateHistory: []plsvc.RuntimeStatus{
			{UpdateTime: now, State: "PENDING"},
		},
	}
	c.runs[runID] = run

	go c.progressRun(runID)

	return run, nil
}

func (c *PipelinesClient) GetPipelineRun(_ context.Context, _ string, runID string) (*plsvc.PipelineRun, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	run, ok := c.runs[runID]
	if !ok {
		return nil, fmt.Errorf("run %q not found", runID)
	}
	cp := *run
	return &cp, nil
}

func (c *PipelinesClient) ListPipelineRuns(_ context.Context, _ string, params *plsvc.ListRunsParams) (*plsvc.PipelineRunResponse, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	var runs []plsvc.PipelineRun
	for _, r := range c.runs {
		if params != nil && params.Filter != "" {
			if r.PipelineVersionReference == nil ||
				!strings.Contains(params.Filter, r.PipelineVersionReference.PipelineVersionID) {
				continue
			}
		}
		runs = append(runs, *r)
	}

	return &plsvc.PipelineRunResponse{
		Runs:      runs,
		TotalSize: int32(len(runs)),
	}, nil
}

func (c *PipelinesClient) TerminateRun(_ context.Context, _ string, runID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	run, ok := c.runs[runID]
	if !ok {
		return fmt.Errorf("run %q not found", runID)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	run.State = "CANCELING"
	run.StateHistory = append(run.StateHistory, plsvc.RuntimeStatus{UpdateTime: now, State: "CANCELING"})
	go func() {
		time.Sleep(2 * time.Second)
		c.mu.Lock()
		defer c.mu.Unlock()
		if r, ok := c.runs[runID]; ok && r.State == "CANCELING" {
			fin := time.Now().UTC().Format(time.RFC3339)
			r.State = "FAILED"
			r.FinishedAt = fin
			r.StateHistory = append(r.StateHistory, plsvc.RuntimeStatus{UpdateTime: fin, State: "FAILED"})
		}
	}()
	return nil
}

func (c *PipelinesClient) RetryRun(_ context.Context, _ string, runID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	run, ok := c.runs[runID]
	if !ok {
		return fmt.Errorf("run %q not found", runID)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	run.State = "PENDING"
	run.FinishedAt = "1970-01-01T00:00:00Z"
	run.StateHistory = append(run.StateHistory, plsvc.RuntimeStatus{UpdateTime: now, State: "PENDING"})
	go c.progressRun(runID)
	return nil
}

func (c *PipelinesClient) DeleteRun(_ context.Context, _ string, runID string) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.runs, runID)
	return nil
}

func (c *PipelinesClient) ListPipelines(_ context.Context, _ string, _ string) (*plsvc.PipelinesResponse, error) {
	return &plsvc.PipelinesResponse{
		Pipelines: []plsvc.Pipeline{
			{PipelineID: ragPipelineID, DisplayName: "documents-rag-optimization-pipeline"},
		},
		TotalSize: 1,
	}, nil
}

func (c *PipelinesClient) GetPipelineVersion(_ context.Context, _ string, pipelineID, versionID string) (*plsvc.PipelineVersion, error) {
	return &plsvc.PipelineVersion{
		PipelineVersionID: versionID,
		PipelineID:        pipelineID,
		DisplayName:       "latest",
		PipelineSpec:      fakePipelineSpec,
	}, nil
}

func (c *PipelinesClient) ListPipelineVersions(_ context.Context, _ string, pipelineID string) (*plsvc.PipelineVersionsResponse, error) {
	return &plsvc.PipelineVersionsResponse{
		PipelineVersions: []plsvc.PipelineVersion{
			{PipelineVersionID: ragPipelineVersionID, PipelineID: pipelineID, DisplayName: "latest"},
		},
		TotalSize: 1,
	}, nil
}

func (c *PipelinesClient) CreatePipeline(_ context.Context, _ string, name string) (*plsvc.Pipeline, error) {
	return &plsvc.Pipeline{PipelineID: uuid.New().String(), DisplayName: name}, nil
}

func (c *PipelinesClient) UploadPipelineVersion(_ context.Context, _ string, pipelineID, versionName string, _ []byte) (*plsvc.PipelineVersion, error) {
	return &plsvc.PipelineVersion{
		PipelineVersionID: uuid.New().String(),
		PipelineID:        pipelineID,
		DisplayName:       versionName,
	}, nil
}

// progressRun simulates PENDING → RUNNING → SUCCEEDED. After a short delay
// all tasks are marked SUCCEEDED at once.
func (c *PipelinesClient) progressRun(runID string) {
	taskNames := dagTaskNames()

	time.Sleep(5 * time.Second)
	c.mu.Lock()
	run, ok := c.runs[runID]
	if !ok || run.State != "PENDING" {
		c.mu.Unlock()
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	run.State = "RUNNING"
	run.StateHistory = append(run.StateHistory, plsvc.RuntimeStatus{UpdateTime: now, State: "RUNNING"})
	run.RunDetails = &plsvc.RunDetails{TaskDetails: make([]plsvc.TaskDetail, 0, len(taskNames))}

	for _, name := range taskNames {
		run.RunDetails.TaskDetails = append(run.RunDetails.TaskDetails, plsvc.TaskDetail{
			RunID: runID, TaskID: uuid.New().String(), DisplayName: name,
			State: "PENDING", CreateTime: run.CreatedAt, StartTime: now,
			StateHistory: []plsvc.RuntimeStatus{{UpdateTime: now, State: "PENDING"}},
		})
	}
	c.mu.Unlock()

	// Wait one poll cycle then mark everything done.
	time.Sleep(10 * time.Second)
	c.mu.Lock()
	run, ok = c.runs[runID]
	if !ok || run.State != "RUNNING" {
		c.mu.Unlock()
		return
	}
	fin := time.Now().UTC().Format(time.RFC3339)
	for i := range run.RunDetails.TaskDetails {
		td := &run.RunDetails.TaskDetails[i]
		td.State = "SUCCEEDED"
		td.EndTime = fin
		td.StateHistory = append(td.StateHistory,
			plsvc.RuntimeStatus{UpdateTime: fin, State: "RUNNING"},
			plsvc.RuntimeStatus{UpdateTime: fin, State: "SUCCEEDED"},
		)
	}
	run.State = "SUCCEEDED"
	run.FinishedAt = fin
	run.StateHistory = append(run.StateHistory, plsvc.RuntimeStatus{UpdateTime: fin, State: "SUCCEEDED"})
	c.mu.Unlock()
}

func (c *PipelinesClient) seedRuns() {
	seed := func(id, name, state, createdAt, finishedAt string) {
		params := map[string]any{
			"embedding_models":              []any{"vllm-embedding/ibm-granite/granite-embedding-english-r2"},
			"generation_models":             []any{"vllm-inference/meta-llama/Llama-3.1-8B-Instruct"},
			"input_data_bucket_name":        "autorag-data",
			"input_data_key":                "autorag input data/pdf/ibm_earnings_pdf/documents",
			"input_data_secret_name":        "data-connection",
			"ogx_secret_name":               "ogx",
			"optimization_max_rag_patterns": 8,
			"optimization_metric":           "faithfulness",
			"test_data_bucket_name":         "autorag-data",
			"test_data_key":                 "benchmark.json",
			"test_data_secret_name":         "data-connection",
			"vector_io_provider_id":         "milvus",
		}

		history := []plsvc.RuntimeStatus{
			{UpdateTime: createdAt, State: "PENDING"},
			{UpdateTime: createdAt, State: "RUNNING"},
		}
		if state == "SUCCEEDED" || state == "FAILED" {
			history = append(history, plsvc.RuntimeStatus{UpdateTime: finishedAt, State: state})
		}

		c.runs[id] = &plsvc.PipelineRun{
			RunID:        id,
			DisplayName:  name,
			ExperimentID: defaultExperimentID,
			PipelineVersionReference: &plsvc.PipelineVersionReference{
				PipelineID:        ragPipelineID,
				PipelineVersionID: ragPipelineVersionID,
			},
			RuntimeConfig:  &plsvc.RuntimeConfig{Parameters: params},
			State:          state,
			StorageState:   "AVAILABLE",
			ServiceAccount: "pipeline-runner-dspa",
			CreatedAt:      createdAt,
			ScheduledAt:    createdAt,
			FinishedAt:     finishedAt,
			StateHistory:   history,
			RunDetails:     buildSeedRunDetails(id, state, createdAt, finishedAt),
		}
	}

	seed(seedRunID, "rag", "SUCCEEDED",
		"2026-07-16T07:10:24Z", "2026-07-16T08:25:00Z")
}

func dagTaskNames() []string {
	return []string{
		"publish-component-stage-map",
		"test-data-loader",
		"documents-discovery",
		"text-extraction",
		"search-space-preparation",
		"rag-templates-optimization",
	}
}

func buildSeedRunDetails(runID, state, createdAt, finishedAt string) *plsvc.RunDetails {
	tasks := dagTaskNames()
	details := make([]plsvc.TaskDetail, 0, len(tasks))
	for _, name := range tasks {
		details = append(details, plsvc.TaskDetail{
			RunID:       runID,
			TaskID:      uuid.New().String(),
			DisplayName: name,
			State:       state,
			CreateTime:  createdAt,
			StartTime:   createdAt,
			EndTime:     finishedAt,
			StateHistory: []plsvc.RuntimeStatus{
				{UpdateTime: createdAt, State: "RUNNING"},
				{UpdateTime: finishedAt, State: state},
			},
		})
	}
	return &plsvc.RunDetails{TaskDetails: details}
}
