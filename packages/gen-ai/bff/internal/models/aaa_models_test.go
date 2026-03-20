package models

import (
	"testing"
)

func TestIsExternalModelSource(t *testing.T) {
	tests := []struct {
		name       string
		sourceType ModelSourceTypeEnum
		expected   bool
	}{
		{
			name:       "custom_endpoint is external",
			sourceType: ModelSourceTypeCustomEndpoint,
			expected:   true,
		},
		{
			name:       "namespace is not external",
			sourceType: ModelSourceTypeNamespace,
			expected:   false,
		},
		{
			name:       "maas is not external",
			sourceType: ModelSourceTypeMaaS,
			expected:   false,
		},
		{
			name:       "empty string is not external",
			sourceType: "",
			expected:   false,
		},
		{
			name:       "unknown value is not external",
			sourceType: "unknown",
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := IsExternalModelSource(tt.sourceType)
			if result != tt.expected {
				t.Errorf("IsExternalModelSource(%q) = %v, expected %v", tt.sourceType, result, tt.expected)
			}
		})
	}
}
