package api

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	kubernetes "github.com/opendatahub-io/eval-hub/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

// infoOverrideEHClient overrides the info response of the base client.
type infoOverrideEHClient struct {
	erroringEHClient
	info evalhub.InfoResponse
}

func (c *infoOverrideEHClient) GetInfo(_ context.Context, _ string) (*evalhub.InfoResponse, error) {
	return &c.info, nil
}

type deniedInfoK8sClient struct {
	testK8sClient
}

func (c *deniedInfoK8sClient) CanListEvalHubInstances(_ context.Context, _ *kubernetes.RequestIdentity, _ string) (bool, error) {
	return false, nil
}

func TestQueueRoutesRequireEvalHubAccessBeforeAnyReads(t *testing.T) {
	for _, testCase := range []struct {
		name   string
		method string
		url    string
		body   interface{}
	}{
		{"info", http.MethodGet, "/eval-hub/api/v1/info?namespace=test-namespace", nil},
		{"profile validation", http.MethodPost, "/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace", models.HardwareProfileValidationRequest{HardwareProfiles: []string{"gpu"}}},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			_, response, err := setupApiTestWithEvalHub[HTTPError](
				testCase.method,
				testCase.url,
				testCase.body,
				&crStatusK8sFactory{client: &deniedInfoK8sClient{}},
				&kubernetes.RequestIdentity{UserID: "test-user"},
				nil,
			)
			if err != nil {
				t.Fatalf("request failed: %v", err)
			}
			if response.StatusCode != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusForbidden)
			}
		})
	}
}

// TestInfoHandlerProxiesServiceProfiles verifies that the info endpoint returns
// the tenant hardware profiles reported by the EvalHub service.
func TestInfoHandlerProxiesServiceProfiles(t *testing.T) {
	result, response, err := setupApiTestWithEvalHub[InfoEnvelope](
		http.MethodGet,
		"/eval-hub/api/v1/info?namespace=test-namespace",
		nil,
		&crStatusK8sFactory{client: &testK8sClient{}},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		nil,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusOK)
	}
	if len(result.Data.HardwareProfiles) != 1 {
		t.Fatalf("hardware profiles = %+v, want the mock profile", result.Data.HardwareProfiles)
	}
	profile := result.Data.HardwareProfiles[0]
	if profile.Name != "default-gpu" || profile.SchedulingType != "queue" || profile.QueueName != "default" {
		t.Fatalf("profile = %+v, want default-gpu on queue default", profile)
	}
	if profile.QueueAvailability == nil || profile.QueueAvailability.Status != "active" {
		t.Fatalf("queue availability = %+v, want active", profile.QueueAvailability)
	}
}

// TestValidateHardwareProfilesHandlerEvaluatesAllProfiles verifies that one validation request
// compares every requested profile with the selected providers and reports insufficient resources
// without removing the profile from the response.
func TestValidateHardwareProfilesHandlerEvaluatesAllProfiles(t *testing.T) {
	queueProfile := func(name, defaultCPU string) evalhub.HardwareProfileInfo {
		return evalhub.HardwareProfileInfo{
			Name:           name,
			SchedulingType: "queue",
			QueueName:      "default",
			Identifiers: []evalhub.HardwareProfileIdentifier{
				{Identifier: "cpu", DefaultCount: defaultCPU},
			},
		}
	}
	evalHubClient := &paginatedProvidersClient{
		infoOverrideEHClient: infoOverrideEHClient{info: evalhub.InfoResponse{
			HardwareProfiles: []evalhub.HardwareProfileInfo{
				queueProfile("cpu-small", "1"),
				queueProfile("cpu-large", "4"),
			},
		}},
		pages: map[int]evalhub.ProvidersResponse{
			0: {
				Items: []evalhub.Provider{{
					Resource: evalhub.ProviderResource{ID: "provider-a"},
					Runtime: &evalhub.ProviderRuntime{K8s: &evalhub.ProviderK8sRuntime{
						CPURequest: "2",
					}},
				}},
				TotalCount: 1,
			},
		},
	}

	result, response, err := setupApiTestWithEvalHub[HardwareProfileValidationEnvelope](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{
			HardwareProfiles: []string{"cpu-small", "cpu-large"},
			ProviderIDs:      []string{"provider-a"},
		},
		&crStatusK8sFactory{client: &testK8sClient{}},
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
}

// TestValidateHardwareProfilesHandlerRequiresProfiles verifies that validation cannot run without
// at least one requested HardwareProfile.
func TestValidateHardwareProfilesHandlerRequiresProfiles(t *testing.T) {
	_, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{ProviderIDs: []string{"provider-a"}},
		&crStatusK8sFactory{client: &testK8sClient{}},
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

// TestValidateHardwareProfilesHandlerReportsMissingProfile verifies that validation is rejected
// when the requested profile is not offered to the tenant — the service re-filters per call, so
// this also covers a LocalQueue deleted after the form loaded.
func TestValidateHardwareProfilesHandlerReportsMissingProfile(t *testing.T) {
	ehClient := &infoOverrideEHClient{info: evalhub.InfoResponse{
		HardwareProfiles: []evalhub.HardwareProfileInfo{
			{Name: "other", SchedulingType: "queue", QueueName: "unrelated"},
		},
	}}
	result, response, err := setupApiTestWithEvalHub[HTTPError](
		http.MethodPost,
		"/eval-hub/api/v1/hardwareprofiles/validate?namespace=test-namespace",
		models.HardwareProfileValidationRequest{HardwareProfiles: []string{"gpu"}, ProviderIDs: []string{"provider"}},
		&crStatusK8sFactory{client: &testK8sClient{}},
		&kubernetes.RequestIdentity{UserID: "test-user"},
		ehClient,
	)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if response.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.StatusCode, http.StatusBadRequest)
	}
	if result.Error.Message != "HardwareProfile \"gpu\" is not available in namespace \"test-namespace\"" {
		t.Fatalf("unexpected error response: %+v", result)
	}
}

type paginatedProvidersClient struct {
	infoOverrideEHClient
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
		}}, TotalCount: maxProvidersLimit + 1},
	}}

	providers, missing, err := listSelectedProviders(
		context.Background(),
		client,
		"test-namespace",
		map[string]struct{}{"target-provider": {}},
	)
	if err != nil {
		t.Fatalf("listSelectedProviders failed: %v", err)
	}
	if len(missing) != 0 {
		t.Fatalf("missing providers = %v, want none", missing)
	}
	if len(providers) != 1 || providers[0].Resource.ID != "target-provider" {
		t.Fatalf("providers = %+v, want target-provider", providers)
	}
	if len(client.calls) != 2 || client.calls[1] != maxProvidersLimit {
		t.Fatalf("provider page offsets = %v, want two pages with the second at offset %d", client.calls, maxProvidersLimit)
	}
}

// TestValidateProfileAgainstProvider verifies that a hardware profile meeting every provider
// CPU, memory, and GPU requirement produces no validation mismatches.
func TestValidateProfileAgainstProvider(t *testing.T) {
	profile := evalhub.HardwareProfileInfo{
		Name: "small",
		Identifiers: []evalhub.HardwareProfileIdentifier{
			{Identifier: "cpu", DefaultCount: "1", MaxCount: "2"},
			{Identifier: "memory", DefaultCount: "4Gi", MaxCount: "8Gi"},
			{Identifier: "nvidia.com/gpu", DefaultCount: "1", MaxCount: "1"},
		},
	}
	provider := evalhub.Provider{
		Resource: evalhub.ProviderResource{ID: "gpu-provider"},
		Runtime: &evalhub.ProviderRuntime{K8s: &evalhub.ProviderK8sRuntime{
			CPURequest:    "1",
			CPULimit:      "2",
			MemoryRequest: "4Gi",
			MemoryLimit:   "8Gi",
			GPU:           &evalhub.ProviderGPU{Resource: "nvidia.com/gpu", Count: 1},
		}},
	}

	if mismatches := validateProfileAgainstProvider(profile, provider); len(mismatches) != 0 {
		t.Fatalf("expected profile to satisfy provider, got mismatches: %+v", mismatches)
	}
}

// TestValidateProfileAgainstProviderReportsResourceMismatches verifies that undersized or missing
// CPU, memory, and GPU resources are reported as actionable provider mismatches.
func TestValidateProfileAgainstProviderReportsResourceMismatches(t *testing.T) {
	profile := evalhub.HardwareProfileInfo{
		Name: "small",
		Identifiers: []evalhub.HardwareProfileIdentifier{
			{Identifier: "cpu", DefaultCount: "500m", MaxCount: "1"},
			{Identifier: "memory", DefaultCount: "1Gi", MaxCount: "2Gi"},
		},
	}
	provider := evalhub.Provider{
		Resource: evalhub.ProviderResource{ID: "gpu-provider"},
		Runtime: &evalhub.ProviderRuntime{K8s: &evalhub.ProviderK8sRuntime{
			CPURequest:    "1",
			CPULimit:      "2",
			MemoryRequest: "4Gi",
			MemoryLimit:   "8Gi",
			GPU:           &evalhub.ProviderGPU{Resource: "nvidia.com/gpu", Count: 1},
		}},
	}

	mismatches := validateProfileAgainstProvider(profile, provider)
	if len(mismatches) != 5 {
		t.Fatalf("expected five mismatches, got %d: %+v", len(mismatches), mismatches)
	}
	for _, mismatch := range mismatches {
		if mismatch.ProviderID != "gpu-provider" || mismatch.Message == "" {
			t.Fatalf("expected actionable provider mismatch, got %+v", mismatch)
		}
	}
}

// TestValidateProfileAgainstProviderRejectsInvalidProviderQuantity verifies that an invalid
// provider resource quantity is returned as a validation mismatch instead of being ignored.
func TestValidateProfileAgainstProviderRejectsInvalidProviderQuantity(t *testing.T) {
	profile := evalhub.HardwareProfileInfo{
		Name:        "small",
		Identifiers: []evalhub.HardwareProfileIdentifier{{Identifier: "cpu", DefaultCount: "1"}},
	}
	provider := evalhub.Provider{
		Resource: evalhub.ProviderResource{ID: "provider-with-invalid-config"},
		Runtime: &evalhub.ProviderRuntime{K8s: &evalhub.ProviderK8sRuntime{
			CPURequest: "not-a-quantity",
		}},
	}

	mismatches := validateProfileAgainstProvider(profile, provider)
	if len(mismatches) != 1 {
		t.Fatalf("expected one mismatch, got %d: %+v", len(mismatches), mismatches)
	}
	if !strings.Contains(mismatches[0].Message, "invalid cpu resource quantity") {
		t.Fatalf("expected invalid quantity mismatch, got %+v", mismatches[0])
	}
}

// TestFindProfileResourcePrefersGPUResources verifies that generic GPU requirements do not match
// unrelated qualified resources when a GPU-specific resource is available.
func TestFindProfileResourcePrefersGPUResources(t *testing.T) {
	resources := map[string]evalhub.HardwareProfileIdentifier{
		"openshift.io/sriov-nic": {Identifier: "openshift.io/sriov-nic", DefaultCount: "8"},
		"nvidia.com/gpu":         {Identifier: "nvidia.com/gpu", DefaultCount: "1"},
	}

	profileResource, found := findProfileResource(resources, "gpu")
	if !found || profileResource.Identifier != "nvidia.com/gpu" {
		t.Fatalf("generic GPU matched %+v, want nvidia.com/gpu", profileResource)
	}
}

// TestFindProfileResourceRejectsAmbiguousExtendedResourceFallback verifies that a generic GPU
// requirement is not assigned to an arbitrary qualified resource.
func TestFindProfileResourceRejectsAmbiguousExtendedResourceFallback(t *testing.T) {
	resources := map[string]evalhub.HardwareProfileIdentifier{
		"example.com/fpga":       {Identifier: "example.com/fpga", DefaultCount: "1"},
		"openshift.io/sriov-nic": {Identifier: "openshift.io/sriov-nic", DefaultCount: "1"},
	}

	if profileResource, found := findProfileResource(resources, "gpu"); found {
		t.Fatalf("generic GPU unexpectedly matched %+v", profileResource)
	}
}

// TestFindProfileResourceRejectsSoleUnrelatedExtendedResource verifies that a generic GPU
// requirement does not fall back to a profile's only extended resource when it is not a GPU.
func TestFindProfileResourceRejectsSoleUnrelatedExtendedResource(t *testing.T) {
	resources := map[string]evalhub.HardwareProfileIdentifier{
		"openshift.io/sriov-nic": {Identifier: "openshift.io/sriov-nic", DefaultCount: "1"},
	}

	if profileResource, found := findProfileResource(resources, "gpu"); found {
		t.Fatalf("generic GPU unexpectedly matched %+v", profileResource)
	}
}
