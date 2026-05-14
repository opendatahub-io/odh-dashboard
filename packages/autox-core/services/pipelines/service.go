package pipelines

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	k8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
)

// PipelinesService provides business logic for Pipelines operations.
// All public methods accept a namespace and resolve the DSPA base URL internally.
type PipelinesService struct {
	Client        PipelinesClientInterface
	K8sService    *k8s.K8sService
	Logger        *slog.Logger
	pipelineCache *pipelineCache
	dspaCache     *dspaCache
	inFlight      map[string]chan struct{}
	inFlightMu    sync.Mutex
}

type PipelinesServiceConfig struct {
	Logger *slog.Logger
}

func NewPipelinesService(cfg PipelinesServiceConfig, client PipelinesClientInterface, k8sService *k8s.K8sService) *PipelinesService {
	return &PipelinesService{
		Client:        client,
		K8sService:    k8sService,
		Logger:        cfg.Logger,
		pipelineCache: newPipelineCache(),
		dspaCache:     newDSPACache(),
		inFlight:      make(map[string]chan struct{}),
	}
}

// --- Pipeline Run CRUD ---

func (s *PipelinesService) CreatePipelineRun(ctx context.Context, namespace string, req *CreatePipelineRunRequest) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline run", "namespace", namespace, "display_name", req.DisplayName)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) GetPipelineRun(ctx context.Context, namespace, runID string) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline run", "namespace", namespace, "run_id", runID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) ListPipelineRuns(ctx context.Context, namespace string, params *ListRunsParams) (*PipelineRunResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline runs", "namespace", namespace)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) TerminateRun(ctx context.Context, namespace, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("terminating pipeline run", "namespace", namespace, "run_id", runID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return err
	}

	if err := s.Client.TerminateRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to terminate pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

func (s *PipelinesService) RetryRun(ctx context.Context, namespace, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("retrying pipeline run", "namespace", namespace, "run_id", runID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return err
	}

	if err := s.Client.RetryRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to retry pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

func (s *PipelinesService) DeleteRun(ctx context.Context, namespace, runID string) error {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("deleting pipeline run", "namespace", namespace, "run_id", runID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return err
	}

	if err := s.Client.DeleteRun(ctx, baseURL, runID); err != nil {
		s.Logger.Error("failed to delete pipeline run", "run_id", runID, "error", err)
		return err
	}

	return nil
}

// --- Pipeline CRUD ---

func (s *PipelinesService) ListPipelines(ctx context.Context, namespace, filter string) (*PipelinesResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipelines", "namespace", namespace)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) GetPipelineVersion(ctx context.Context, namespace, pipelineID, versionID string) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline version", "namespace", namespace, "pipeline_id", pipelineID, "version_id", versionID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) ListPipelineVersions(ctx context.Context, namespace, pipelineID string) (*PipelineVersionsResponse, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("listing pipeline versions", "namespace", namespace, "pipeline_id", pipelineID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) CreatePipeline(ctx context.Context, namespace, name string) (*Pipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("creating pipeline", "namespace", namespace, "name", name)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

func (s *PipelinesService) UploadPipelineVersion(ctx context.Context, namespace, pipelineID, versionName string, fileContent []byte) (*PipelineVersion, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("uploading pipeline version", "namespace", namespace, "pipeline_id", pipelineID, "version_name", versionName)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
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

// --- Pipeline Discovery ---

// DiscoverPipelineByName discovers a pipeline by exact display name and optionally by version name.
// If versionName is empty, the latest version is used.
//
// Returns:
//   - (*DiscoveredPipeline, nil): pipeline and version found
//   - (nil, nil): no matching pipeline or version (soft miss)
//   - (nil, err): API failure (hard error)
func (s *PipelinesService) DiscoverPipelineByName(ctx context.Context, namespace, pipelineName, versionName string) (*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering pipeline by name", "namespace", namespace, "name", pipelineName)

	if pipelineName == "" {
		return nil, fmt.Errorf("pipeline name is required for discovery")
	}

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return nil, err
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
		if (p.Namespace == "" || p.Namespace == namespace) &&
			strings.EqualFold(p.DisplayName, pipelineName) {
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
// For each definition, tries the exact default version first, then falls back to any available
// version so runs from older pipeline versions remain discoverable.
// Results are cached per namespace with a 5-minute TTL.
func (s *PipelinesService) DiscoverNamedPipelines(ctx context.Context, namespace, defaultVersion string, definitions map[string]string) (map[string]*DiscoveredPipeline, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("discovering named pipelines", "namespace", namespace, "count", len(definitions))

	if namespace == "" {
		return nil, fmt.Errorf("namespace is required for pipeline discovery")
	}

	if cached := s.pipelineCache.get(namespace); cached != nil {
		return cached, nil
	}

	result := make(map[string]*DiscoveredPipeline)

	for pipelineType, name := range definitions {
		if name == "" {
			continue
		}

		versionName := fmt.Sprintf("%s-%s", name, defaultVersion)
		discovered, err := s.DiscoverPipelineByName(ctx, namespace, name, versionName)
		if err != nil {
			return nil, fmt.Errorf("failed to discover pipeline %q: %w", pipelineType, err)
		}
		if discovered == nil {
			discovered, err = s.DiscoverPipelineByName(ctx, namespace, name, "")
			if err != nil {
				return nil, fmt.Errorf("failed to discover pipeline %q (fallback): %w", pipelineType, err)
			}
		}
		if discovered != nil {
			result[pipelineType] = discovered
		}
	}

	if len(result) > 0 {
		s.pipelineCache.set(namespace, result)
	}

	return result, nil
}

// EnsurePipeline discovers a pipeline by definition, creating it if it does not exist.
// Unlike DiscoverNamedPipelines, this requires the exact version — if missing it creates
// the version rather than falling back to an older one.
// Concurrent callers for the same pipeline are serialized to prevent duplicate creation.
func (s *PipelinesService) EnsurePipeline(ctx context.Context, namespace string, def PipelineDefinition) (*DiscoveredPipeline, error) {
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

	discovered, err := s.DiscoverPipelineByName(ctx, namespace, pipelineName, versionName)
	if err != nil {
		return nil, err
	}
	if discovered != nil {
		return discovered, nil
	}

	if len(def.FileContent) == 0 {
		return nil, fmt.Errorf("no pipeline %q version %q found and no file content provided for auto-creation", pipelineName, versionName)
	}

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return nil, err
	}

	createKey := fmt.Sprintf("%s:%s", namespace, versionName)
	s.inFlightMu.Lock()
	if doneCh, ok := s.inFlight[createKey]; ok {
		s.inFlightMu.Unlock()
		select {
		case <-doneCh:
		case <-ctx.Done():
			return nil, ctx.Err()
		}
		return s.DiscoverPipelineByName(ctx, namespace, pipelineName, versionName)
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
	discovered, err = s.DiscoverPipelineByName(ctx, namespace, pipelineName, versionName)
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
		if errors.Is(err, ErrConflict) {
			logger.Info("pipeline version already exists, retrying discovery",
				"name", pipelineName, "version", versionName, "namespace", namespace)
			discovered, discoverErr := s.DiscoverPipelineByName(ctx, namespace, pipelineName, versionName)
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

	s.pipelineCache.invalidate(namespace)

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
			if errors.Is(err, ErrConflict) {
				continue
			}
			return "", fmt.Errorf("failed to create pipeline %q: %w", pipelineName, err)
		}

		return created.PipelineID, nil
	}

	return "", fmt.Errorf("failed to find or create pipeline %q after %d attempts", pipelineName, maxRetries)
}

// --- Aggregation ---

// CollectVersionIDs returns all pipeline version IDs for a given pipeline.
// Checks the discovery cache first, then falls back to the API.
func (s *PipelinesService) CollectVersionIDs(ctx context.Context, namespace, pipelineID string) ([]string, error) {
	if pipelineID == "" {
		return nil, nil
	}

	if ids := s.pipelineCache.getCachedVersionIDs(pipelineID); ids != nil {
		return ids, nil
	}

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return nil, err
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

const maxRunsPerPipeline = 10000

// GetAllPipelineRuns fetches all pages of runs for a pipeline, across all its versions.
// Auto-paginates through KFP results, capped at maxRunsPerPipeline for safety.
func (s *PipelinesService) GetAllPipelineRuns(ctx context.Context, namespace, pipelineID string) ([]PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("fetching all pipeline runs", "namespace", namespace, "pipelineID", pipelineID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return nil, err
	}

	versionIDs, err := s.CollectVersionIDs(ctx, namespace, pipelineID)
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

// GetPipelineRunWithSpec retrieves a pipeline run enriched with pipeline_spec from its version.
// If the version fetch fails, the run is returned without the spec (best-effort enrichment).
func (s *PipelinesService) GetPipelineRunWithSpec(ctx context.Context, namespace, runID string) (*PipelineRun, error) {
	logger := s.loggerWithIdentity(ctx)
	logger.Info("getting pipeline run with spec", "namespace", namespace, "run_id", runID)

	baseURL, err := s.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return nil, err
	}

	run, err := s.Client.GetPipelineRun(ctx, baseURL, runID)
	if err != nil {
		if errors.Is(err, ErrPipelineNotFound) {
			return nil, ErrPipelineRunNotFound
		}
		return nil, fmt.Errorf("error fetching pipeline run: %w", err)
	}

	if run == nil {
		return nil, ErrPipelineRunNotFound
	}

	ref := run.PipelineVersionReference
	if ref != nil && ref.PipelineID != "" && ref.PipelineVersionID != "" {
		version, vErr := s.Client.GetPipelineVersion(ctx, baseURL, ref.PipelineID, ref.PipelineVersionID)
		if vErr != nil {
			logger.Warn("failed to fetch pipeline version for spec enrichment",
				"pipelineID", ref.PipelineID,
				"versionID", ref.PipelineVersionID,
				"error", vErr)
		} else if version != nil && len(version.PipelineSpec) > 0 {
			run.PipelineSpec = version.PipelineSpec
		}
	}

	return run, nil
}

// --- Internal ---

func (s *PipelinesService) loggerWithIdentity(ctx context.Context) *slog.Logger {
	identity, err := k8s.IdentityFromContext(ctx)
	if err != nil {
		s.Logger.Error("missing identity in context", "error", err)
		return s.Logger
	}
	return s.Logger.With("user", identity.UserID)
}
