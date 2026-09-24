package api

import (
	"context"
	"fmt"
	"net/http"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/config"
	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type kueueHardwareProfilesK8sClient struct {
	testK8sClient
	availability               *models.KueueAvailability
	profiles                   *models.HardwareProfilesResponse
	workloadStatuses           *models.KueueWorkloadStatusesResponse
	missingQueue               string
	queueMissing               bool
	evaluationNamespace        string
	profileNamespace           string
	missingEvaluationNamespace string
	missingProfileNamespace    string
	workloadNamespace          string
	workloadEvaluationIDs      []string
	err                        error
}

func (c *kueueHardwareProfilesK8sClient) GetKueueAvailability(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (*models.KueueAvailability, error) {
	if c.err != nil {
		return nil, c.err
	}
	return c.availability, nil
}

func (c *kueueHardwareProfilesK8sClient) GetKueueWorkloadStatuses(_ context.Context, _ *kubernetes.RequestIdentity, namespace string, evaluationIDs []string) (*models.KueueWorkloadStatusesResponse, error) {
	c.workloadNamespace = namespace
	c.workloadEvaluationIDs = evaluationIDs
	if c.err != nil {
		return nil, c.err
	}
	return c.workloadStatuses, nil
}

func (c *kueueHardwareProfilesK8sClient) ListHardwareProfiles(_ context.Context, _ *kubernetes.RequestIdentity, evaluationNamespace, hardwareProfilesNamespace string) (*models.HardwareProfilesResponse, error) {
	c.evaluationNamespace = evaluationNamespace
	c.profileNamespace = hardwareProfilesNamespace
	if c.err != nil {
		return nil, c.err
	}
	return c.profiles, nil
}

func (c *kueueHardwareProfilesK8sClient) GetMissingHardwareProfileLocalQueueName(_ context.Context, _ *kubernetes.RequestIdentity, evaluationNamespace, hardwareProfilesNamespace, _ string) (string, bool, error) {
	c.missingEvaluationNamespace = evaluationNamespace
	c.missingProfileNamespace = hardwareProfilesNamespace
	return c.missingQueue, c.queueMissing, c.err
}

// TestHardwareProfilesNamespaceUsesConfiguredOverride verifies that a local BFF
// can query the exact platform namespace configured on the EvalHub service.
func TestHardwareProfilesNamespaceUsesConfiguredOverride(t *testing.T) {
	app := &App{
		config:             config.EnvConfig{HardwareProfilesNamespace: "evalhub-platform"},
		dashboardNamespace: "dashboard-platform",
	}
	if namespace := app.hardwareProfilesNamespace(); namespace != "evalhub-platform" {
		t.Fatalf("hardwareProfilesNamespace() = %q, want evalhub-platform", namespace)
	}
}

// TestKueueAvailabilityHandlerReturnsAvailability verifies that the availability endpoint returns
// the Kueue and LocalQueue information reported by Kubernetes for the requested namespace.
func TestKueueAvailabilityHandlerReturnsAvailability(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{
		availability: &models.KueueAvailability{
			Enabled:              true,
			SchedulingReady:      true,
			ClusterEnabled:       true,
			NamespaceManaged:     true,
			LocalQueuesAvailable: true,
			LocalQueueNames:      []string{"gpu-default"},
		},
	}
	result, response, err := setupApiTestWithEvalHub[KueueAvailabilityEnvelope](
		http.MethodGet,
		"/eval-hub/api/v1/kueue/availability?namespace=test-namespace",
		nil,
		&crStatusK8sFactory{client: client},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if !result.Data.Enabled || result.Data.LocalQueueNames[0] != "gpu-default" {
		t.Fatalf("unexpected availability response: %+v", result.Data)
	}
}

// TestKueueWorkloadStatusesHandlerReturnsStatuses verifies that the status endpoint returns
// Kueue status data and passes a de-duplicated evaluation-ID list in the requested namespace.
func TestKueueWorkloadStatusesHandlerReturnsStatuses(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{workloadStatuses: &models.KueueWorkloadStatusesResponse{
		Items: []models.KueueWorkloadStatus{{
			EvaluationID: "job-1",
			QueueName:    "default",
			State:        models.KueueWorkloadStateQueued,
			Message:      "Waiting for quota",
		}},
	}}
	result, response, err := setupApiTestWithEvalHub[KueueWorkloadStatusesEnvelope](
		http.MethodGet,
		"/eval-hub/api/v1/kueue/workloads?namespace=test-namespace&evaluation_ids=job-1,job-2,job-1",
		nil,
		&crStatusK8sFactory{client: client},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if len(result.Data.Items) != 1 || result.Data.Items[0].State != models.KueueWorkloadStateQueued {
		t.Fatalf("unexpected Kueue Workload response: %+v", result.Data)
	}
	if client.workloadNamespace != "test-namespace" {
		t.Fatalf("Workload namespace = %q, want test-namespace", client.workloadNamespace)
	}
	if len(client.workloadEvaluationIDs) != 2 || client.workloadEvaluationIDs[0] != "job-1" || client.workloadEvaluationIDs[1] != "job-2" {
		t.Fatalf("evaluation IDs = %v, want [job-1 job-2]", client.workloadEvaluationIDs)
	}
}

// TestKueueWorkloadStatusesHandlerRejectsMissingEvaluationIDs verifies that evaluation IDs are
// required, so the BFF never lists Workloads without a specific set of evaluation runs to match.
func TestKueueWorkloadStatusesHandlerRejectsMissingEvaluationIDs(t *testing.T) {
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodGet,
		"/eval-hub/api/v1/kueue/workloads?namespace=test-namespace",
		nil,
		&crStatusK8sFactory{client: &kueueHardwareProfilesK8sClient{}},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusBadRequest)
	}
}

// TestHardwareProfilesHandlerReturnsProfiles verifies that the profile endpoint returns
// queue-compatible HardwareProfiles from the platform namespace and checks their
// LocalQueues in the namespace where the evaluation will run.
func TestHardwareProfilesHandlerReturnsProfiles(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{profiles: &models.HardwareProfilesResponse{
		Items: []models.HardwareProfile{{
			Name:             "gpu",
			DisplayName:      "GPU",
			Enabled:          true,
			SchedulingType:   "Queue",
			LocalQueueName:   "gpu-default",
			ClusterQueueName: "gpu-cluster",
		}},
	}}
	result, response, err := setupApiTestWithEvalHub[HardwareProfilesEnvelope](
		http.MethodGet,
		"/eval-hub/api/v1/hardwareprofiles?namespace=test-namespace",
		nil,
		&crStatusK8sFactory{client: client},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if len(result.Data.Items) != 1 || result.Data.Items[0].LocalQueueName != "gpu-default" || result.Data.Items[0].ClusterQueueName != "gpu-cluster" {
		t.Fatalf("unexpected HardwareProfiles response: %+v", result.Data)
	}
	if client.evaluationNamespace != "test-namespace" || client.profileNamespace != "test-dashboard-ns" {
		t.Fatalf("HardwareProfile namespaces = (%q, %q), want (test-namespace, test-dashboard-ns)", client.evaluationNamespace, client.profileNamespace)
	}
}

// TestValidateHardwareProfilesHandlerEvaluatesAllProfiles verifies that one validation request
// compares every requested profile with the selected providers and reports insufficient resources
// without removing the profile from the response.
func TestValidateHardwareProfilesHandlerEvaluatesAllProfiles(t *testing.T) {
	k8sClient := &kueueHardwareProfilesK8sClient{profiles: &models.HardwareProfilesResponse{
		Items: []models.HardwareProfile{
			{
				Name:      "cpu-small",
				Resources: []models.HardwareProfileResource{{Identifier: "cpu", Default: "1"}},
			},
			{
				Name:      "cpu-large",
				Resources: []models.HardwareProfileResource{{Identifier: "cpu", Default: "4"}},
			},
		},
	}}
	evalHubClient := &paginatedProvidersClient{pages: map[int]evalhub.ProvidersResponse{
		0: {
			Items: []evalhub.Provider{{
				Resource: evalhub.ProviderResource{ID: "provider-a"},
				Runtime: &evalhub.ProviderRuntime{K8s: &evalhub.ProviderK8sRuntime{
					CPURequest: "2",
				}},
			}},
			TotalCount: 1,
		},
	}}

	result, response, err := setupApiTestWithEvalHub[HardwareProfileValidationEnvelope](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{
			HardwareProfiles: []string{"cpu-small", "cpu-large"},
			ProviderIDs:      []string{"provider-a"},
		},
		&crStatusK8sFactory{client: k8sClient},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		evalHubClient,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if len(result.Data.Items) != 2 {
		t.Fatalf("validation items = %d, want 2: %+v", len(result.Data.Items), result.Data.Items)
	}
	if result.Data.Items[0].HardwareProfile != "cpu-small" || result.Data.Items[0].Compatible {
		t.Fatalf("small profile result = %+v, want incompatible", result.Data.Items[0])
	}
	if result.Data.Items[1].HardwareProfile != "cpu-large" || !result.Data.Items[1].Compatible {
		t.Fatalf("large profile result = %+v, want compatible", result.Data.Items[1])
	}
	if len(evalHubClient.calls) != 1 {
		t.Fatalf("ListProviders() calls = %d, want 1", len(evalHubClient.calls))
	}
	if k8sClient.evaluationNamespace != "test-namespace" || k8sClient.profileNamespace != "test-dashboard-ns" {
		t.Fatalf(
			"HardwareProfile namespaces = (%q, %q), want (test-namespace, test-dashboard-ns)",
			k8sClient.evaluationNamespace,
			k8sClient.profileNamespace,
		)
	}
}

// TestValidateHardwareProfilesHandlerRequiresProfiles verifies that validation cannot run without
// at least one requested HardwareProfile.
func TestValidateHardwareProfilesHandlerRequiresProfiles(t *testing.T) {
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{ProviderIDs: []string{"provider-a"}},
		&crStatusK8sFactory{client: &kueueHardwareProfilesK8sClient{}},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusBadRequest)
	}
}

// TestValidateHardwareProfilesHandlerReportsDeletedLocalQueue verifies that submission is rejected
// if the selected profile references a LocalQueue that was deleted after the form loaded.
func TestValidateHardwareProfilesHandlerReportsDeletedLocalQueue(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{
		profiles:     &models.HardwareProfilesResponse{},
		missingQueue: "gpu-default",
		queueMissing: true,
	}
	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{HardwareProfiles: []string{"gpu"}, ProviderIDs: []string{"provider"}},
		&crStatusK8sFactory{client: client},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusBadRequest)
	}
	if result.Error.Message != "LocalQueue \"gpu-default\" configured by HardwareProfile \"gpu\" is no longer available in namespace \"test-namespace\"" {
		t.Fatalf("unexpected error response: %+v", result)
	}
	if client.evaluationNamespace != "test-namespace" || client.profileNamespace != "test-dashboard-ns" || client.missingEvaluationNamespace != "test-namespace" || client.missingProfileNamespace != "test-dashboard-ns" {
		t.Fatalf("HardwareProfile namespaces = (%q, %q, %q, %q), want (test-namespace, test-dashboard-ns, test-namespace, test-dashboard-ns)", client.evaluationNamespace, client.profileNamespace, client.missingEvaluationNamespace, client.missingProfileNamespace)
	}
}

// TestValidateHardwareProfilesHandlerReportsProfileMissingFromPlatformNamespace verifies that
// submission is rejected if the chosen HardwareProfile no longer exists in the platform namespace.
func TestValidateHardwareProfilesHandlerReportsProfileMissingFromPlatformNamespace(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{profiles: &models.HardwareProfilesResponse{}}
	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{HardwareProfiles: []string{"gpu"}, ProviderIDs: []string{"provider"}},
		&crStatusK8sFactory{client: client},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusBadRequest)
	}
	if result.Error.Message != "HardwareProfile \"gpu\" is not available in platform namespace \"test-dashboard-ns\"" {
		t.Fatalf("unexpected error response: %+v", result)
	}
	if client.evaluationNamespace != "test-namespace" || client.profileNamespace != "test-dashboard-ns" || client.missingEvaluationNamespace != "test-namespace" || client.missingProfileNamespace != "test-dashboard-ns" {
		t.Fatalf("HardwareProfile namespaces = (%q, %q, %q, %q), want (test-namespace, test-dashboard-ns, test-namespace, test-dashboard-ns)", client.evaluationNamespace, client.profileNamespace, client.missingEvaluationNamespace, client.missingProfileNamespace)
	}
}

type paginatedProvidersClient struct {
	erroringEHClient
	pages map[int]evalhub.ProvidersResponse
	calls []int
}

func (c *paginatedProvidersClient) ListProviders(_ context.Context, _ string, limit, offset int) (evalhub.ProvidersResponse, error) {
	if limit != maxProvidersLimit {
		return evalhub.ProvidersResponse{}, fmt.Errorf("limit = %d, want %d", limit, maxProvidersLimit)
	}
	c.calls = append(c.calls, offset)
	return c.pages[offset], nil
}

// TestListSelectedProvidersFollowsPagination verifies that validation checks every provider page,
// rather than incorrectly declaring a provider missing when it is not on the first page.
func TestListSelectedProvidersFollowsPagination(t *testing.T) {
	firstPage := make([]evalhub.Provider, maxProvidersLimit)
	for i := range firstPage {
		firstPage[i] = evalhub.Provider{Resource: evalhub.ProviderResource{ID: fmt.Sprintf("provider-%d", i)}}
	}
	client := &paginatedProvidersClient{pages: map[int]evalhub.ProvidersResponse{
		0: {Items: firstPage, TotalCount: maxProvidersLimit + 1},
		maxProvidersLimit: {Items: []evalhub.Provider{{
			Resource: evalhub.ProviderResource{ID: "target-provider"},
			Name:     "target-provider",
		}}, TotalCount: maxProvidersLimit + 1},
	}}

	providers, missing, err := listSelectedProviders(
		context.Background(),
		client,
		"test-namespace",
		map[string]struct{}{"target-provider": {}},
	)
	if err != nil {
		t.Fatalf("listSelectedProviders() error = %v", err)
	}
	if len(missing) != 0 || len(providers) != 1 || providers[0].Resource.ID != "target-provider" {
		t.Fatalf("unexpected selected providers: providers=%+v missing=%v", providers, missing)
	}
	if len(client.calls) != 2 || client.calls[1] != maxProvidersLimit {
		t.Fatalf("provider page offsets = %v, want [0 %d]", client.calls, maxProvidersLimit)
	}
}
