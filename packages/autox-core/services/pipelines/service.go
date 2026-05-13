package pipelines

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// PipelinesService provides business logic for Pipelines operations
type PipelinesService struct {
	Client     PipelinesClientInterface
	K8sService *k8s.K8sService
	Logger     *slog.Logger
	pipelineCache *pipelineCache
	dspaCache  *dspaCache
	inFlight   map[string]chan struct{}
	inFlightMu sync.Mutex
}

type PipelinesServiceConfig struct {
	Logger *slog.Logger
}

func NewPipelinesService(cfg PipelinesServiceConfig, client PipelinesClientInterface, k8sService *k8s.K8sService) *PipelinesService {
	return &PipelinesService{
		Client:     client,
		K8sService: k8sService,
		Logger:     cfg.Logger,
		pipelineCache: newPipelineCache(),
		dspaCache:  newDSPACache(),
		inFlight:   make(map[string]chan struct{}),
	}
}

// PipelineTargetOptions specifies where to execute pipeline operations
type PipelineTargetOptions struct {
	// Namespace to discover DSPA in (mutually exclusive with BaseURL)
	Namespace string
	// BaseURL to use directly (mutually exclusive with Namespace)
	BaseURL string
}

// CreatePipelineRun creates a pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) CreatePipelineRun(ctx context.Context, opts PipelineTargetOptions, req *CreatePipelineRunRequest) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline run", "pipeline_id", req.PipelineID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.CreatePipelineRun(ctx, baseURL, req)
	if err != nil {
		s.Logger.Error("failed to create pipeline run", "error", err)
		return nil, err
	}

	return run, nil
}

// GetPipelineRun retrieves a pipeline run by ID
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) GetPipelineRun(ctx context.Context, opts PipelineTargetOptions, runID string) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.GetPipelineRun(ctx, baseURL, runID)
	if err != nil {
		s.Logger.Error("failed to get pipeline run", "run_id", runID, "error", err)
		return nil, err
	}

	return run, nil
}

// ListPipelineRuns lists pipeline runs
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelineRuns(ctx context.Context, opts PipelineTargetOptions, params *ListRunsParams) (*PipelineRunResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline runs")

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelineRuns(ctx, baseURL, params)
	if err != nil {
		s.Logger.Error("failed to list pipeline runs", "error", err)
		return nil, err
	}

	return response, nil
}

// TerminateRun terminates a running pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) TerminateRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("terminating pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.TerminateRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to terminate pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// RetryRun retries a failed pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) RetryRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("retrying pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.RetryRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to retry pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// DeleteRun deletes a pipeline run
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) DeleteRun(ctx context.Context, opts PipelineTargetOptions, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("deleting pipeline run", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return err
	}

	if err := s.Client.DeleteRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to delete pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// ListPipelines lists all pipelines
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelines(ctx context.Context, opts PipelineTargetOptions, filter string) (*PipelinesResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipelines")

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelines(ctx, baseURL, filter)
	if err != nil {
		s.Logger.Error("failed to list pipelines", "error", err)
		return nil, err
	}

	return response, nil
}

// GetPipelineVersion retrieves a pipeline version
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) GetPipelineVersion(ctx context.Context, opts PipelineTargetOptions, pipelineID, versionID string) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline version", "pipeline_id", pipelineID, "version_id", versionID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	version, err := s.Client.GetPipelineVersion(ctx, baseURL, pipelineID, versionID)
	if err != nil {
		s.Logger.Error("failed to get pipeline version", "pipeline_id", pipelineID, "version_id", versionID, "error", err)
		return nil, err
	}

	return version, nil
}

// ListPipelineVersions lists all versions for a pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) ListPipelineVersions(ctx context.Context, opts PipelineTargetOptions, pipelineID string) (*PipelineVersionsResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline versions", "pipeline_id", pipelineID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	response, err := s.Client.ListPipelineVersions(ctx, baseURL, pipelineID)
	if err != nil {
		s.Logger.Error("failed to list pipeline versions", "pipeline_id", pipelineID, "error", err)
		return nil, err
	}

	return response, nil
}

// CreatePipeline creates a new pipeline
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) CreatePipeline(ctx context.Context, opts PipelineTargetOptions, name string) (*Pipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline", "name", name)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	pipeline, err := s.Client.CreatePipeline(ctx, baseURL, name)
	if err != nil {
		s.Logger.Error("failed to create pipeline", "name", name, "error", err)
		return nil, err
	}

	return pipeline, nil
}

// UploadPipelineVersion uploads a new pipeline version
// Provide either Namespace (to discover DSPA) or BaseURL (to use directly)
func (s *PipelinesService) UploadPipelineVersion(ctx context.Context, opts PipelineTargetOptions, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("uploading pipeline version", "pipeline_id", pipelineID, "version_name", versionName)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	version, err := s.Client.UploadPipelineVersion(ctx, baseURL, pipelineID, versionName, fileContent)
	if err != nil {
		s.Logger.Error("failed to upload pipeline version", "pipeline_id", pipelineID, "version_name", versionName, "error", err)
		return nil, err
	}

	return version, nil
}

// DiscoverPipelineByName discovers a pipeline by exact display name and optionally by version name.
// If versionName is empty, the latest version is used.
//
// Returns:
//   - (*DiscoveredPipeline, nil): pipeline and version found
//   - (nil, nil): no matching pipeline or version (soft miss)
//   - (nil, err): API failure (hard error)
func (s *PipelinesService) DiscoverPipelineByName(ctx context.Context, baseURL, namespace, pipelineName, versionName string) (*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering pipeline by name", "namespace", namespace, "name", pipelineName)

	if pipelineName == "" {
		return nil, fmt.Errorf("pipeline name is required for discovery")
	}

	nameFilter := BuildPipelineNameFilter(pipelineName)

	pipelinesResp, err := s.Client.ListPipelines(ctx, baseURL, nameFilter)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipelines: %w", err)
	}

	if pipelinesResp == nil || len(pipelinesResp.Pipelines) == 0 {
		return nil, nil
	}

	var matchedPipeline *Pipeline
	for i := range pipelinesResp.Pipelines {
		p := &pipelinesResp.Pipelines[i]
		if strings.EqualFold(p.DisplayName, pipelineName) {
			matchedPipeline = p
			break
		}
	}

	if matchedPipeline == nil {
		return nil, nil
	}

	versionsResp, err := s.Client.ListPipelineVersions(ctx, baseURL, matchedPipeline.PipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list versions for pipeline %s: %w", matchedPipeline.PipelineID, err)
	}

	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		return nil, nil
	}

	var matchedVersion *PipelineVersion
	if versionName != "" {
		for i := range versionsResp.PipelineVersions {
			v := &versionsResp.PipelineVersions[i]
			if strings.EqualFold(v.DisplayName, versionName) {
				matchedVersion = v
				break
			}
		}
	} else {
		matchedVersion = &versionsResp.PipelineVersions[0]
	}

	if matchedVersion == nil {
		return nil, nil
	}

	allIDs := make([]string, 0, len(versionsResp.PipelineVersions))
	for _, v := range versionsResp.PipelineVersions {
		allIDs = append(allIDs, v.PipelineVersionID)
	}

	return &DiscoveredPipeline{
		PipelineID:        matchedPipeline.PipelineID,
		PipelineVersionID: matchedVersion.PipelineVersionID,
		PipelineName:      matchedPipeline.DisplayName,
		Namespace:         namespace,
		AllVersionIDs:     allIDs,
		DiscoveredAt:      time.Now(),
	}, nil
}

// DiscoverNamedPipelines discovers multiple managed pipelines, one per entry in definitions.
// The definitions map is keyed by pipeline type (e.g. "timeseries", "tabular") with values
// being exact pipeline display names.
//
// For each definition, tries the exact default version first, then falls back to any available
// version so runs from older pipeline versions remain discoverable.
//
// Results are cached per baseURL:namespace with a 5-minute TTL.
// Returns a partial map — missing keys mean the pipeline was not found (soft miss).
func (s *PipelinesService) DiscoverNamedPipelines(ctx context.Context, baseURL, namespace, defaultVersion string, definitions map[string]string) (map[string]*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering named pipelines", "namespace", namespace, "count", len(definitions))

	if namespace == "" {
		return nil, fmt.Errorf("namespace is required for pipeline discovery")
	}

	key := cacheKey(baseURL, namespace)

	if cached := s.pipelineCache.get(key); cached != nil {
		return cached, nil
	}

	result := make(map[string]*DiscoveredPipeline)

	for pipelineType, name := range definitions {
		if name == "" {
			continue
		}

		versionName := fmt.Sprintf("%s-%s", name, defaultVersion)
		discovered, err := s.DiscoverPipelineByName(ctx, baseURL, namespace, name, versionName)
		if err != nil {
			return nil, fmt.Errorf("failed to discover pipeline %q: %w", pipelineType, err)
		}
		if discovered == nil {
			discovered, err = s.DiscoverPipelineByName(ctx, baseURL, namespace, name, "")
			if err != nil {
				return nil, fmt.Errorf("failed to discover pipeline %q (fallback): %w", pipelineType, err)
			}
		}
		if discovered != nil {
			result[pipelineType] = discovered
		}
	}

	if len(result) > 0 {
		s.pipelineCache.set(key, result)
	}

	return result, nil
}

// InvalidateDiscoveryCache removes cached discovery results for a given base URL and namespace.
func (s *PipelinesService) InvalidateDiscoveryCache(baseURL, namespace string) {
	s.pipelineCache.invalidate(cacheKey(baseURL, namespace))
}

// EnsurePipeline discovers a pipeline by definition, creating it if it does not exist.
// Unlike DiscoverNamedPipelines, this requires the exact version — if missing it creates
// the version rather than falling back to an older one.
// Concurrent callers for the same pipeline are serialized to prevent duplicate creation.
func (s *PipelinesService) EnsurePipeline(ctx context.Context, baseURL, namespace string, def PipelineDefinition) (*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)

	pipelineName := def.Name
	if pipelineName == "" {
		return nil, fmt.Errorf("pipeline name is required")
	}
	if def.Version == "" {
		return nil, fmt.Errorf("pipeline version is required")
	}

	versionName := fmt.Sprintf("%s-%s", pipelineName, def.Version)

	logger.Info("ensuring pipeline exists", "name", pipelineName, "version", versionName, "namespace", namespace)

	discovered, err := s.DiscoverPipelineByName(ctx, baseURL, namespace, pipelineName, versionName)
	if err != nil {
		return nil, err
	}
	if discovered != nil {
		return discovered, nil
	}

	if len(def.FileContent) == 0 {
		return nil, fmt.Errorf("no pipeline %q version %q found and no file content provided for auto-creation", pipelineName, versionName)
	}

	createKey := fmt.Sprintf("%s:%s:%s", baseURL, namespace, versionName)
	s.inFlightMu.Lock()
	if doneCh, ok := s.inFlight[createKey]; ok {
		s.inFlightMu.Unlock()
		select {
		case <-doneCh:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		return s.DiscoverPipelineByName(ctx, baseURL, namespace, pipelineName, versionName)
	}
	doneCh := make(chan struct{})
	s.inFlight[createKey] = doneCh
	s.inFlightMu.Unlock()
	defer func() {
		close(doneCh)
		s.inFlightMu.Lock()
		delete(s.inFlight, createKey)
		s.inFlightMu.Unlock()
	}()

	// Double-check after registering
	discovered, err = s.DiscoverPipelineByName(ctx, baseURL, namespace, pipelineName, versionName)
	if err != nil {
		return nil, err
	}
	if discovered != nil {
		return discovered, nil
	}

	return s.ensurePipelineAndVersion(ctx, baseURL, namespace, pipelineName, versionName, def)
}

func (s *PipelinesService) ensurePipelineAndVersion(ctx context.Context, baseURL, namespace, pipelineName, versionName string, def PipelineDefinition) (*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)

	pipelineID, err := s.findOrCreatePipeline(ctx, baseURL, pipelineName)
	if err != nil {
		return nil, err
	}

	version, err := s.Client.UploadPipelineVersion(ctx, baseURL, pipelineID, versionName, def.FileContent)
	if err != nil {
		var httpErr *HTTPError
		if errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusConflict {
			logger.Info("pipeline version already exists, retrying discovery",
				"name", pipelineName, "version", versionName, "namespace", namespace)
			discovered, discoverErr := s.DiscoverPipelineByName(ctx, baseURL, namespace, pipelineName, versionName)
			if discoverErr != nil {
				return nil, discoverErr
			}
			if discovered != nil {
				return discovered, nil
			}
			return nil, fmt.Errorf("pipeline version %q already exists but could not be discovered", versionName)
		}
		return nil, fmt.Errorf("failed to upload pipeline version %q: %w", versionName, err)
	}

	logger.Info("auto-created pipeline version",
		"pipelineID", pipelineID,
		"versionID", version.PipelineVersionID,
		"versionName", versionName,
		"namespace", namespace)

	s.InvalidateDiscoveryCache(baseURL, namespace)

	return &DiscoveredPipeline{
		PipelineID:        pipelineID,
		PipelineVersionID: version.PipelineVersionID,
		PipelineName:      pipelineName,
		Namespace:         namespace,
		DiscoveredAt:      time.Now(),
	}, nil
}

func (s *PipelinesService) findOrCreatePipeline(ctx context.Context, baseURL, pipelineName string) (string, error) {
	const maxRetries = 3
	for range maxRetries {
		nameFilter := BuildPipelineNameFilter(pipelineName)
		pipelinesResp, err := s.Client.ListPipelines(ctx, baseURL, nameFilter)
		if err != nil {
			return "", fmt.Errorf("failed to list pipelines: %w", err)
		}

		if pipelinesResp != nil {
			for i := range pipelinesResp.Pipelines {
				p := &pipelinesResp.Pipelines[i]
				if strings.EqualFold(p.DisplayName, pipelineName) {
					return p.PipelineID, nil
				}
			}
		}

		created, err := s.Client.CreatePipeline(ctx, baseURL, pipelineName)
		if err != nil {
			var httpErr *HTTPError
			if errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusConflict {
				continue
			}
			return "", fmt.Errorf("failed to create pipeline %q: %w", pipelineName, err)
		}

		return created.PipelineID, nil
	}

	return "", fmt.Errorf("failed to find or create pipeline %q after %d attempts", pipelineName, maxRetries)
}

// CollectVersionIDs returns all pipeline version IDs for a given pipeline.
// Checks the discovery cache first, then falls back to the API.
// Caps at maxVersionIDs (100) and skips empty IDs.
func (s *PipelinesService) CollectVersionIDs(ctx context.Context, baseURL, pipelineID string) ([]string, error) {
	if pipelineID == "" {
		return nil, nil
	}

	if ids := s.pipelineCache.getCachedVersionIDs(pipelineID); ids != nil {
		return ids, nil
	}

	versionsResp, err := s.Client.ListPipelineVersions(ctx, baseURL, pipelineID)
	if err != nil {
		return nil, fmt.Errorf("failed to list pipeline versions: %w", err)
	}
	if versionsResp == nil || len(versionsResp.PipelineVersions) == 0 {
		return nil, nil
	}

	versions := versionsResp.PipelineVersions
	if len(versions) > maxVersionIDs {
		versions = versions[:maxVersionIDs]
	}

	ids := make([]string, 0, len(versions))
	for _, v := range versions {
		if strings.TrimSpace(v.PipelineVersionID) != "" {
			ids = append(ids, v.PipelineVersionID)
		}
	}
	if len(ids) == 0 {
		return nil, nil
	}
	return ids, nil
}

// PaginatedRuns holds a page of sorted pipeline runs with the total count.
type PaginatedRuns struct {
	Runs      []PipelineRun
	TotalSize int32
}

// SortAndPaginateRuns sorts runs by created_at descending (ties broken by run_id)
// and returns the requested page. Uses int64 arithmetic to prevent overflow.
// page is 1-indexed; pageSize must be > 0.
func SortAndPaginateRuns(runs []PipelineRun, page int64, pageSize int32) PaginatedRuns {
	sort.Slice(runs, func(i, j int) bool {
		ti := runs[i].CreatedAt
		tj := runs[j].CreatedAt
		switch {
		case ti == nil && tj == nil:
			return runs[i].RunID > runs[j].RunID
		case ti == nil:
			return false
		case tj == nil:
			return true
		case !ti.Equal(*tj):
			return ti.After(*tj)
		default:
			return runs[i].RunID > runs[j].RunID
		}
	})

	total := int64(len(runs))
	start := (page - 1) * int64(pageSize)
	end := start + int64(pageSize)

	if start < 0 {
		start = 0
	}
	if start > total {
		start = total
	}
	if end < start {
		end = start
	}
	if end > total {
		end = total
	}

	return PaginatedRuns{
		Runs:      runs[int(start):int(end)],
		TotalSize: int32(total),
	}
}

const maxRunsPerPipeline = 10000

// GetAllPipelineRuns fetches all pages of runs for a pipeline, across all its versions.
// Auto-paginates through KFP results, capped at maxRunsPerPipeline for safety.
func (s *PipelinesService) GetAllPipelineRuns(ctx context.Context, opts PipelineTargetOptions, pipelineID string) ([]PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching all pipeline runs", "pipelineID", pipelineID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	versionIDs, err := s.CollectVersionIDs(ctx, baseURL, pipelineID)
	if err != nil {
		return nil, fmt.Errorf("error collecting pipeline version IDs: %w", err)
	}
	if len(versionIDs) == 0 {
		return nil, nil
	}

	filter, err := BuildRunFilter(versionIDs)
	if err != nil {
		return nil, fmt.Errorf("error building filter: %w", err)
	}

	var allRuns []PipelineRun
	pageToken := ""

	for {
		params := &ListRunsParams{
			PageSize:  100,
			PageToken: pageToken,
			SortBy:    "created_at desc",
			Filter:    filter,
		}

		response, err := s.Client.ListPipelineRuns(ctx, baseURL, params)
		if err != nil {
			return nil, fmt.Errorf("error fetching pipeline runs: %w", err)
		}

		if response == nil || len(response.Runs) == 0 {
			break
		}

		remaining := maxRunsPerPipeline - len(allRuns)
		for i := range response.Runs {
			if i >= remaining {
				break
			}
			allRuns = append(allRuns, response.Runs[i])
		}

		if len(allRuns) >= maxRunsPerPipeline {
			break
		}

		if response.NextPageToken == "" {
			break
		}
		pageToken = response.NextPageToken
	}

	return allRuns, nil
}

// GetPipelineRunWithSpec retrieves a pipeline run by ID, enriched with the pipeline_spec
// from its pipeline version. The spec is needed for DAG topology visualization.
// If the version fetch fails, the run is returned without the spec (best-effort enrichment).
func (s *PipelinesService) GetPipelineRunWithSpec(ctx context.Context, opts PipelineTargetOptions, runID string) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline run with spec", "run_id", runID)

	baseURL, err := s.resolveBaseURL(ctx, opts)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.GetPipelineRun(ctx, baseURL, runID)
	if err != nil {
		var httpErr *HTTPError
		if errors.As(err, &httpErr) && httpErr.StatusCode == http.StatusNotFound {
			return nil, ErrPipelineRunNotFound
		}
		return nil, fmt.Errorf("error fetching pipeline run: %w", err)
	}

	if run == nil {
		return nil, ErrPipelineRunNotFound
	}

	if run.PipelineID != "" && run.PipelineVersionID != "" {
		version, vErr := s.Client.GetPipelineVersion(ctx, baseURL, run.PipelineID, run.PipelineVersionID)
		if vErr != nil {
			logger.Warn("failed to fetch pipeline version for spec enrichment",
				"pipelineID", run.PipelineID,
				"versionID", run.PipelineVersionID,
				"error", vErr)
		} else if version != nil && version.PipelineSpec != nil {
			run.PipelineSpec = version.PipelineSpec
		}
	}

	return run, nil
}

// loggerWithIdentity extracts identity from context and returns a logger with the user field attached.
// If identity extraction fails, it logs the error and returns the base logger (without user field).
func (s *PipelinesService) loggerWithIdentity(ctx context.Context) *slog.Logger {
	identity, err := k8s.IdentityFromContext(ctx)
	if err != nil {
		// This indicates a middleware configuration issue - log but don't fail the request
		s.Logger.Error("missing identity in context", "error", err)
		return s.Logger
	}
	// Return a logger with user field already attached
	return s.Logger.With("user", identity.UserID)
}
