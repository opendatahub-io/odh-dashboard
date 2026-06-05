package repositories

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"sync"

	k8s "github.com/kubeflow/hub/ui/bff/internal/integrations/kubernetes"
	batchv1 "k8s.io/api/batch/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
)

const (
	maxConcurrentNamespaceFetches = 10
)

// ErrProjectsAPIUnavailable signals that the OpenShift Projects API could not
// be reached. Callers should fall back to the default (cluster-wide) handler.
var ErrProjectsAPIUnavailable = errors.New("OpenShift Projects API unavailable")

// ProjectScopedJobsRepository encapsulates the OpenShift-specific logic for
// listing model transfer jobs across the namespaces accessible to a user.
type ProjectScopedJobsRepository struct {
	logger *slog.Logger
}

func NewProjectScopedJobsRepository(logger *slog.Logger) *ProjectScopedJobsRepository {
	return &ProjectScopedJobsRepository{logger: logger}
}

// CreateScopedClient builds a KubernetesClientInterface wrapper whose
// GetAllModelTransferJobs method fetches jobs only from the namespaces the
// user can access (discovered via the OpenShift Projects API) instead of
// requiring cluster-wide RBAC.
//
// The returned client embeds the original client, overriding only the
// job-listing method so that upstream enrichment logic (pod status, events)
// continues to work unchanged.
func (r *ProjectScopedJobsRepository) CreateScopedClient(
	ctx context.Context,
	client k8s.KubernetesClientInterface,
	bearerToken string,
) (k8s.KubernetesClientInterface, error) {
	cfg, err := restConfigForClient(client)
	if err != nil {
		return nil, fmt.Errorf("failed to get REST config: %w", err)
	}

	namespaces, err := r.listOpenShiftProjects(ctx, cfg, bearerToken)
	if err != nil {
		return nil, err
	}

	userCfg := rest.AnonymousClientConfig(cfg)
	userCfg.BearerToken = bearerToken
	userCfg.BearerTokenFile = ""

	clientset, err := kubernetes.NewForConfig(userCfg)
	if err != nil {
		return nil, fmt.Errorf("failed to create kubernetes client: %w", err)
	}

	return &projectScopedClient{
		KubernetesClientInterface: client,
		userClientset:             clientset,
		namespaces:                namespaces,
	}, nil
}

// projectScopedClient wraps a KubernetesClientInterface and overrides
// GetAllModelTransferJobs to list jobs from specific namespaces instead of
// using NamespaceAll.
type projectScopedClient struct {
	k8s.KubernetesClientInterface
	userClientset kubernetes.Interface
	namespaces    []string
}

// GetAllModelTransferJobs overrides the interface method to list jobs from the
// user's accessible namespaces rather than requiring cluster-wide permission.
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

// listOpenShiftProjects uses the OpenShift Projects API (project.openshift.io/v1)
// to list all projects accessible to the user identified by the bearer token.
// It uses the provided base REST config (already extracted by the caller via
// restConfigForClient) to derive the cluster endpoint, ensuring we use the
// same base config the K8s integration layer constructed.
func (r *ProjectScopedJobsRepository) listOpenShiftProjects(ctx context.Context, baseConfig *rest.Config, bearerToken string) ([]string, error) {
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
		return nil, fmt.Errorf("%w: %w", ErrProjectsAPIUnavailable, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("%w: status %d", ErrProjectsAPIUnavailable, resp.StatusCode)
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
	return FilterSystemNamespaces(namespaces), nil
}

// FilterSystemNamespaces removes system namespaces that will never contain
// model transfer jobs. This matches the filtering in
// packages/gen-ai/bff/internal/repositories/namespace.go.
func FilterSystemNamespaces(namespaces []string) []string {
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
