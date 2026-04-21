package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"

	"github.com/julienschmidt/httprouter"

	"github.com/kubeflow/model-registry/ui/bff/internal/api"
	"github.com/kubeflow/model-registry/ui/bff/internal/constants"
	helper "github.com/kubeflow/model-registry/ui/bff/internal/helpers"
	k8s "github.com/kubeflow/model-registry/ui/bff/internal/integrations/kubernetes"
	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	// modelTransferJobListHandlerID must match the HandlerID string used in upstream's
	// route registration (api.HandlerIDModelTransferJobList = "modelTransferJobs:list").
	modelTransferJobListHandlerID = api.HandlerID("modelTransferJobs:list")

	// maxConcurrentNamespaceFetches limits the number of parallel namespace job queries.
	maxConcurrentNamespaceFetches = 10
)

var (
	// listProjects is the function used to list OpenShift Projects accessible to the user.
	// It is a package-level variable so tests can replace it with a mock.
	listProjects = listOpenShiftProjects

	// createScopedClient creates a project-scoped K8s client wrapper.
	// It is a package-level variable so tests can replace it with a mock.
	createScopedClient func(original k8s.KubernetesClientInterface, bearerToken string, namespaces []string) (k8s.KubernetesClientInterface, error) = newProjectScopedClientAsInterface
)

func init() {
	api.RegisterHandlerOverride(modelTransferJobListHandlerID, overrideModelTransferJobsList)
}

// overrideModelTransferJobsList provides the downstream implementation for listing model transfer jobs.
// Instead of requiring cluster-wide job list permission (metav1.NamespaceAll), it uses the OpenShift
// Projects API to discover namespaces accessible to the user, then fetches jobs from each namespace
// in parallel. This ensures non-admin users can see their transfer jobs without cluster-wide RBAC.
func overrideModelTransferJobsList(app *api.App, buildDefault func() httprouter.Handle) httprouter.Handle {
	if !shouldUseRedHatOverrides(app) {
		return buildDefault()
	}

	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		ctx := r.Context()

		namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
		if !ok || namespace == "" {
			app.BadRequest(w, r, fmt.Errorf("missing namespace in the context"))
			return
		}

		client, ok := getKubernetesClient(app, w, r)
		if !ok {
			return
		}

		modelRegistryID := ps.ByName(api.ModelRegistryId)
		if modelRegistryID == "" {
			app.BadRequest(w, r, fmt.Errorf("model registry name is required"))
			return
		}

		bearerToken, err := client.BearerToken()
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to get bearer token: %w", err))
			return
		}

		// List OpenShift Projects accessible to the user.
		projectNamespaces, err := listProjects(ctx, bearerToken)
		if err != nil {
			// If Projects API is unavailable (non-OpenShift cluster), fall back to default handler.
			app.Logger().Warn("OpenShift Projects API unavailable, falling back to default handler",
				"error", err)
			buildDefault()(w, r, ps)
			return
		}

		// Create a project-scoped client wrapper that fetches jobs only from
		// the user's accessible namespaces instead of NamespaceAll.
		scopedClient, err := createScopedClient(client, bearerToken, projectNamespaces)
		if err != nil {
			app.ServerError(w, r, fmt.Errorf("failed to create project-scoped client: %w", err))
			return
		}

		// Use the upstream repository for the full job conversion/enrichment logic.
		// Pass a non-empty jobNamespace to skip the repository's cluster-wide permission check.
		// The projectScopedClient already scopes job listing to the user's accessible namespaces,
		// so the upstream permission gate is unnecessary. The value is ignored by the scoped client.
		transferJobs, err := app.Repositories().ModelRegistry.GetAllModelTransferJobs(ctx, scopedClient, namespace, modelRegistryID, "project-scoped")
		if err != nil {
			app.ServerError(w, r, err)
			return
		}

		response := api.ModelTransferJobListEnvelope{Data: transferJobs}
		if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
			app.ServerError(w, r, err)
		}
	}
}

// projectScopedClient wraps a KubernetesClientInterface and overrides GetAllModelTransferJobs
// to list jobs from specific namespaces instead of using NamespaceAll.
type projectScopedClient struct {
	k8s.KubernetesClientInterface
	userClientset kubernetes.Interface
	namespaces    []string
}

func newProjectScopedClientAsInterface(original k8s.KubernetesClientInterface, bearerToken string, namespaces []string) (k8s.KubernetesClientInterface, error) {
	return newProjectScopedClient(original, bearerToken, namespaces)
}

func newProjectScopedClient(original k8s.KubernetesClientInterface, bearerToken string, namespaces []string) (*projectScopedClient, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	cfg := rest.AnonymousClientConfig(baseConfig)
	cfg.BearerToken = bearerToken
	cfg.BearerTokenFile = ""

	clientset, err := kubernetes.NewForConfig(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	return &projectScopedClient{
		KubernetesClientInterface: original,
		userClientset:             clientset,
		namespaces:                namespaces,
	}, nil
}

// GetAllModelTransferJobs overrides the interface method to list jobs from the user's
// accessible namespaces rather than requiring cluster-wide permission.
func (c *projectScopedClient) GetAllModelTransferJobs(ctx context.Context, _ string, modelRegistryID string, _ string) (*batchv1.JobList, error) {
	if modelRegistryID == "" {
		return &batchv1.JobList{}, nil
	}

	labelSelector := "modelregistry.kubeflow.org/job-type=async-upload,modelregistry.kubeflow.org/model-registry-name=" + modelRegistryID

	var (
		allJobs []batchv1.Job
		mu      sync.Mutex
		wg      sync.WaitGroup
	)

	// Semaphore to limit concurrent requests.
	sem := make(chan struct{}, maxConcurrentNamespaceFetches)

	for _, ns := range c.namespaces {
		wg.Add(1)
		sem <- struct{}{}
		go func(ns string) {
			defer wg.Done()
			defer func() { <-sem }()

			jobs, err := c.userClientset.BatchV1().Jobs(ns).List(ctx, metav1.ListOptions{
				LabelSelector: labelSelector,
			})
			if err != nil {
				// Skip namespaces where the user can't list jobs — this is expected
				// for namespaces where the user has project access but no batch/v1 permission.
				return
			}

			if len(jobs.Items) > 0 {
				mu.Lock()
				allJobs = append(allJobs, jobs.Items...)
				mu.Unlock()
			}
		}(ns)
	}

	wg.Wait()
	return &batchv1.JobList{Items: allJobs}, nil
}

// projectListResponse is the minimal structure needed to parse the OpenShift Projects API response.
type projectListResponse struct {
	Items []struct {
		Metadata struct {
			Name string `json:"name"`
		} `json:"metadata"`
	} `json:"items"`
}

// listOpenShiftProjects uses the OpenShift Projects API (project.openshift.io/v1) to list
// all projects accessible to the user identified by the bearer token. The Projects API
// returns only projects the user can access, without requiring cluster-wide namespace list permission.
func listOpenShiftProjects(ctx context.Context, bearerToken string) ([]string, error) {
	baseConfig, err := helper.GetKubeconfig()
	if err != nil {
		return nil, fmt.Errorf("failed to get kubeconfig: %w", err)
	}

	cfg := rest.AnonymousClientConfig(baseConfig)
	cfg.BearerToken = bearerToken
	cfg.BearerTokenFile = ""

	transport, err := rest.TransportFor(cfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create transport: %w", err)
	}

	httpClient := &http.Client{Transport: transport}

	projectsURL := strings.TrimRight(cfg.Host, "/") + "/apis/project.openshift.io/v1/projects"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, projectsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create projects request: %w", err)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to list projects: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("projects API returned status %d", resp.StatusCode)
	}

	var projectList projectListResponse
	if err := json.NewDecoder(resp.Body).Decode(&projectList); err != nil {
		return nil, fmt.Errorf("failed to decode projects response: %w", err)
	}

	namespaces := make([]string, 0, len(projectList.Items))
	for _, p := range projectList.Items {
		if p.Metadata.Name != "" {
			namespaces = append(namespaces, p.Metadata.Name)
		}
	}
	return filterSystemNamespaces(namespaces), nil
}

// filterSystemNamespaces removes system namespaces that will never contain model transfer jobs.
// This matches the filtering in packages/gen-ai/bff/internal/repositories/namespace.go.
func filterSystemNamespaces(namespaces []string) []string {
	excludedExact := map[string]bool{
		"default":     true,
		"system":      true,
		"openshift":   true,
		"opendatahub": true,
	}

	filtered := make([]string, 0, len(namespaces))
	for _, ns := range namespaces {
		if strings.HasPrefix(ns, "openshift-") || strings.HasPrefix(ns, "kube-") {
			continue
		}
		if excludedExact[ns] {
			continue
		}
		filtered = append(filtered, ns)
	}
	return filtered
}
