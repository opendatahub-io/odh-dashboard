package api

import (
	"strings"
	"testing"

	"github.com/opendatahub-io/eval-hub/bff/internal/integrations/evalhub"
	"github.com/opendatahub-io/eval-hub/bff/internal/models"
)

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
