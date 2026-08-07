package kubernetes

import (
	"errors"
	"testing"
)

func TestValidateNamespaceName(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr bool
	}{
		{"valid simple", "my-namespace", false},
		{"valid with numbers", "ns-123", false},
		{"valid single char", "a", false},
		{"invalid with dots", "my.namespace", true},
		{"invalid with uppercase", "MyNamespace", true},
		{"invalid with underscore", "my_namespace", true},
		{"empty string", "", true},
		{"too long", string(make([]byte, 64)), true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateNamespaceName(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateNamespaceName(%q) error = %v, wantErr %v", tt.input, err, tt.wantErr)
			}
			if err != nil {
				var ve *ValidationError
				if !errors.As(err, &ve) {
					t.Errorf("expected *ValidationError, got %T", err)
				}
			}
		})
	}
}

func TestValidateResourceName(t *testing.T) {
	tests := []struct {
		name    string
		resType string
		input   string
		wantErr bool
	}{
		{"valid simple", "pod", "my-pod", false},
		{"valid with dots", "secret", "my.secret.name", false},
		{"valid with numbers", "configmap", "cm-123", false},
		{"invalid with uppercase", "pod", "MyPod", true},
		{"invalid with spaces", "pod", "my pod", true},
		{"empty string", "pod", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateResourceName(tt.resType, tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateResourceName(%q, %q) error = %v, wantErr %v", tt.resType, tt.input, err, tt.wantErr)
			}
			if err != nil {
				var ve *ValidationError
				if !errors.As(err, &ve) {
					t.Errorf("expected *ValidationError, got %T", err)
				}
				if ve.Field != tt.resType {
					t.Errorf("ValidationError.Field = %q, want %q", ve.Field, tt.resType)
				}
			}
		})
	}
}
