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

// fakePipelineSpec is a minimal KFP v2 pipeline spec whose DAG includes a
// publish-component-stage-map task so the frontend activates the stage-map
// topology path (buildStageMapTopology). The stage-map topology reads
// component_stage_map.json from S3 (served by fake/s3.go) and renders the
// branching fan-out/fan-in layout with per-model branches.
//
// Component IDs in the stage map (e.g. "data_preparation") map to task IDs
// in run_details.task_details via componentIdToTaskId() which replaces "_"
// with "-" (e.g. "data-preparation").
var fakePipelineSpec = json.RawMessage(`{
  "root": {
    "dag": {
      "tasks": {
        "publish-component-stage-map": {
          "taskInfo": {"name": "publish-component-stage-map"},
          "dependentTasks": [],
          "componentRef": {"name": "publish-component-stage-map"}
        },
        "data-preparation": {
          "taskInfo": {"name": "data-preparation"},
          "dependentTasks": ["publish-component-stage-map"],
          "componentRef": {"name": "data-preparation"}
        },
        "training": {
          "taskInfo": {"name": "training"},
          "dependentTasks": ["data-preparation"],
          "componentRef": {"name": "training"}
        }
      }
    }
  }
}`)

const (
	binarySeedID     = "9ec21d90-baa0-4a6b-bb2a-40d9d4b43c54"
	multiclassSeedID = "a4a27f0d-2cbd-4bb9-b501-335ca0ec14b2"
	regressionSeedID = "4f78f2b7-a297-40bc-95d4-98504d4e50ee"
	timeseriesSeedID = "ba44c73f-307c-4529-84e9-27a0698ae2ae"

	tabularPipelinePrefix    = "autogluon-tabular-training-pipeline"
	timeseriesPipelinePrefix = "autogluon-timeseries-training-pipeline"

	tabularPipelineID        = "33dc7341-9341-4a9a-85e2-ba786f2ebce6"
	tabularPipelineVersionID = "bacc3dfd-e9df-4d39-9a3c-23822a773f1b"
	timeseriesPipelineID     = "426a3bab-734b-4864-b4f2-91383a73d51f"
	timeseriesPipelineVID    = "8f103a0f-7d42-49f6-a9aa-cf5e4f245841"
	defaultExperimentID      = "e3e5bccd-bc4d-4b70-a735-7645c6258950"
)

// PipelinesClient is a stateful fake implementation of pipelines.Client.
// It holds pipeline runs in memory and simulates state progression so the
// automl UI can be tested end-to-end without a live cluster.
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
		// The KFP filter string contains pipeline_version_id values.
		// Match runs whose version ID appears in the filter.
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
			{PipelineID: tabularPipelineID, DisplayName: "autogluon-tabular-training-pipeline"},
			{PipelineID: timeseriesPipelineID, DisplayName: "autogluon-timeseries-training-pipeline"},
		},
		TotalSize: 2,
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
	vid := tabularPipelineVersionID
	if pipelineID == timeseriesPipelineID {
		vid = timeseriesPipelineVID
	}
	return &plsvc.PipelineVersionsResponse{
		PipelineVersions: []plsvc.PipelineVersion{
			{PipelineVersionID: vid, PipelineID: pipelineID, DisplayName: "latest"},
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
// all tasks are marked SUCCEEDED at once so the topology flips from empty to
// fully complete on the next frontend poll.
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

	// Register alias so S3 client serves the correct seed artifacts for this run's task type.
	if run.RuntimeConfig != nil {
		if taskType, ok := run.RuntimeConfig.Parameters["task_type"].(string); ok {
			RegisterRunAlias(runID, taskTypeToSeedID(taskType))
		}
	}
	c.mu.Unlock()
}

func (c *PipelinesClient) seedRuns() {
	seed := func(id, name, state, pipelineID, pipelineVersionID, taskType, labelCol, preset, metric, createdAt, finishedAt string) {
		params := map[string]any{
			"task_type":              taskType,
			"top_n":                  3,
			"train_data_bucket_name": "automl-data",
			"train_data_file_key":    "automl input data/TitanicFullMF.csv",
			"train_data_secret_name": "automl-data",
		}
		if labelCol != "" {
			params["label_column"] = labelCol
		}
		if preset != "" {
			params["preset"] = preset
		}
		if metric != "" {
			params["eval_metric"] = metric
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
				PipelineID:        pipelineID,
				PipelineVersionID: pipelineVersionID,
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

	seed(binarySeedID, "binary", "SUCCEEDED",
		tabularPipelineID, tabularPipelineVersionID,
		"binary", "Survived", "speed", "accuracy",
		"2026-07-14T10:00:00Z", "2026-07-14T10:15:00Z")

	seed(multiclassSeedID, "multiclass", "SUCCEEDED",
		tabularPipelineID, tabularPipelineVersionID,
		"multiclass", "Pclass", "speed", "roc_auc_ovo_macro",
		"2026-07-15T14:00:00Z", "2026-07-15T14:20:00Z")

	seed(regressionSeedID, "regression", "SUCCEEDED",
		tabularPipelineID, tabularPipelineVersionID,
		"regression", "feature1", "balanced", "r2",
		"2026-07-16T09:00:00Z", "2026-07-16T09:12:00Z")

	seed(timeseriesSeedID, "timeseries", "SUCCEEDED",
		timeseriesPipelineID, timeseriesPipelineVID,
		"timeseries", "", "speed", "MASE",
		"2026-07-16T15:00:00Z", "2026-07-16T15:18:00Z")
}

func taskTypeToSeedID(taskType string) string {
	switch taskType {
	case "binary":
		return binarySeedID
	case "multiclass":
		return multiclassSeedID
	case "timeseries":
		return timeseriesSeedID
	default:
		return regressionSeedID
	}
}

// dagTaskNames returns the task names matching the DAG in fakePipelineSpec.
// These correspond to component IDs in the stage map via componentIdToTaskId()
// (underscores replaced with hyphens).
func dagTaskNames() []string {
	return []string{
		"publish-component-stage-map",
		"data-preparation",
		"training",
	}
}

// buildSeedRunDetails creates RunDetails with task entries matching the DAG task IDs
// in fakePipelineSpec so the topology renderer can correlate status to each node.
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
