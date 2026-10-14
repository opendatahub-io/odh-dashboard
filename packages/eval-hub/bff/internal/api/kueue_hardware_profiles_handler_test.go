package api

import (
	"context"
	"net/http"
	"testing"

	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

type kueueHardwareProfilesK8sClient struct {
	testK8sClient
	readCalled bool
}

func (c *kueueHardwareProfilesK8sClient) GetKueueAvailability(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (*models.KueueAvailability, error) {
	c.readCalled = true
	return &models.KueueAvailability{}, nil
}

func (c *kueueHardwareProfilesK8sClient) GetKueueWorkloadStatuses(_ context.Context, _ *kubernetes.RequestIdentity, _ string, _ []string) (*models.KueueWorkloadStatusesResponse, error) {
	c.readCalled = true
	return &models.KueueWorkloadStatusesResponse{}, nil
}

func (c *kueueHardwareProfilesK8sClient) ListHardwareProfiles(_ context.Context, _ *kubernetes.RequestIdentity, _, _ string) (*models.HardwareProfilesResponse, error) {
	c.readCalled = true
	return &models.HardwareProfilesResponse{}, nil
}

func (c *kueueHardwareProfilesK8sClient) GetMissingHardwareProfileLocalQueueName(_ context.Context, _ *kubernetes.RequestIdentity, _, _, _ string) (string, bool, error) {
	c.readCalled = true
	return "", false, nil
}

type deniedKueueK8sClient struct {
	*kueueHardwareProfilesK8sClient
}

func (c *deniedKueueK8sClient) CanListEvalHubInstances(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (bool, error) {
	return false, nil
}

func TestKueueRoutesRequireEvalHubAccessBeforeServiceAccountReads(t *testing.T) {
	for _, testCase := range []struct {
		name   string
		method string
		url    string
		body   interface{}
	}{
		{"availability", http.MethodGet, "/eval-hub/api/v1/kueue/availability?namespace=test-namespace", nil},
		{"workloads", http.MethodGet, "/eval-hub/api/v1/kueue/workloads?namespace=test-namespace&evaluation_ids=job-1", nil},
		{"hardware profiles", http.MethodGet, "/eval-hub/api/v1/hardwareprofiles?namespace=test-namespace", nil},
		{"profile validation", http.MethodPost, "/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace", models.HardwareProfileValidationRequest{HardwareProfiles: []string{"gpu"}}},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			client := &deniedKueueK8sClient{kueueHardwareProfilesK8sClient: &kueueHardwareProfilesK8sClient{}}
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				testCase.method,
				testCase.url,
				testCase.body,
				&crStatusK8sFactory{client: client},
				&kubernetes.RequestIdentity{UserID: "test-user"},
				nil,
			)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if response.StatusCode != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusForbidden)
			}
			if client.readCalled {
				t.Fatal("Kubernetes discovery read ran before the tenant access check")
			}
		})
	}
}

// TestKueueAvailabilityHandlerReturnsDisabledAvailability verifies that the availability
// endpoint reports the Kueue integration as disabled without querying the cluster
// (RHOAIENG-99645).
func TestKueueAvailabilityHandlerReturnsDisabledAvailability(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{}
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
	if result.Data.Enabled || result.Data.SchedulingReady || result.Data.ClusterEnabled || result.Data.NamespaceManaged || result.Data.LocalQueuesAvailable {
		t.Fatalf("unexpected availability response: %+v", result.Data)
	}
	if result.Data.LocalQueueNames == nil || len(result.Data.LocalQueueNames) != 0 {
		t.Fatalf("local queue names = %v, want empty non-nil", result.Data.LocalQueueNames)
	}
	if client.readCalled {
		t.Fatal("availability handler queried Kubernetes despite the Kueue integration being disabled")
	}
}

// TestKueueWorkloadStatusesHandlerReturnsEmptyStatuses verifies that the status endpoint
// returns an empty status set without querying the cluster (RHOAIENG-99645).
func TestKueueWorkloadStatusesHandlerReturnsEmptyStatuses(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{}
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
	if result.Data.Items == nil || len(result.Data.Items) != 0 {
		t.Fatalf("workload statuses = %v, want empty non-nil", result.Data.Items)
	}
	if client.readCalled {
		t.Fatal("workload status handler queried Kubernetes despite the Kueue integration being disabled")
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

// TestHardwareProfilesHandlerReturnsEmptyProfiles verifies that the profile endpoint
// returns an empty list without querying the cluster (RHOAIENG-99645).
func TestHardwareProfilesHandlerReturnsEmptyProfiles(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{}
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
	if result.Data.Items == nil || len(result.Data.Items) != 0 {
		t.Fatalf("hardware profiles = %v, want empty non-nil", result.Data.Items)
	}
	if client.readCalled {
		t.Fatal("hardware profiles handler queried Kubernetes despite the Kueue integration being disabled")
	}
}

// TestValidateHardwareProfilesHandlerReturnsEmptyResults verifies that validation returns
// an empty result set without querying the cluster or the EvalHub service (RHOAIENG-99645).
func TestValidateHardwareProfilesHandlerReturnsEmptyResults(t *testing.T) {
	client := &kueueHardwareProfilesK8sClient{}
	result, response, err := setupApiTestWithEvalHub[HardwareProfileValidationEnvelope](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{
			HardwareProfiles: []string{"gpu"},
			ProviderIDs:      []string{"provider-a"},
		},
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
	if result.Data.Items == nil || len(result.Data.Items) != 0 {
		t.Fatalf("validation results = %v, want empty non-nil", result.Data.Items)
	}
	if client.readCalled {
		t.Fatal("validation handler queried Kubernetes despite the Kueue integration being disabled")
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
