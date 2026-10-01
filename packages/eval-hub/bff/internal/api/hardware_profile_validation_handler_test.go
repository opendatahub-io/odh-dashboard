package api

import (
	"strings"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

// TestValidateProfileAgainstProvider verifies that a hardware profile meeting every provider
// CPU, memory, and GPU requirement produces no validation mismatches.
func TestValidateProfileAgainstProvider(t *testing.T) {
	profile := models.HardwareProfile{
		Name: "small",
		Resources: []models.HardwareProfileResource{
			{Identifier: "cpu", Default: "1", Maximum: "2"},
			{Identifier: "memory", Default: "4Gi", Maximum: "8Gi"},
			{Identifier: "nvidia.com/gpu", Default: "1", Maximum: "1"},
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
	profile := models.HardwareProfile{
		Name: "small",
		Resources: []models.HardwareProfileResource{
			{Identifier: "cpu", Default: "500m", Maximum: "1"},
			{Identifier: "memory", Default: "1Gi", Maximum: "2Gi"},
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
	profile := models.HardwareProfile{
		Name: "small",
		Resources: []models.HardwareProfileResource{
			{Identifier: "cpu", Default: "1"},
		},
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
	resources := map[string]models.HardwareProfileResource{
		"openshift.io/sriov-nic": {Identifier: "openshift.io/sriov-nic", Default: "8"},
		"nvidia.com/gpu":         {Identifier: "nvidia.com/gpu", Default: "1"},
	}

	profileResource, found := findProfileResource(resources, "gpu")
	if !found || profileResource.Identifier != "nvidia.com/gpu" {
		t.Fatalf("generic GPU matched %+v, want nvidia.com/gpu", profileResource)
	}
}

// TestFindProfileResourceRejectsAmbiguousExtendedResourceFallback verifies that a generic GPU
// requirement is not assigned to an arbitrary qualified resource.
func TestFindProfileResourceRejectsAmbiguousExtendedResourceFallback(t *testing.T) {
	resources := map[string]models.HardwareProfileResource{
		"example.com/fpga":       {Identifier: "example.com/fpga", Default: "1"},
		"openshift.io/sriov-nic": {Identifier: "openshift.io/sriov-nic", Default: "1"},
	}

	if profileResource, found := findProfileResource(resources, "gpu"); found {
		t.Fatalf("generic GPU unexpectedly matched %+v", profileResource)
	}
}
