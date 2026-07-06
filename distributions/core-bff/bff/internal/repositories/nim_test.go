package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	k8serrors "k8s.io/apimachinery/pkg/api/errors"
)

func TestDeriveStatusFromAccount_NoConditions(t *testing.T) {
	account := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "nim.opendatahub.io/v1",
			"kind":       "Account",
			"metadata":   map[string]interface{}{"name": "odh-nim-account"},
		},
	}

	status := deriveStatusFromAccount(account)

	assert.True(t, status.IsInstalled)
	assert.False(t, status.IsEnabled)
	assert.True(t, status.CanInstall)
	assert.Equal(t, "Unknown", status.VariablesValidationStatus)
}

func TestDeriveStatusFromAccount_EnabledWithValidKey(t *testing.T) {
	account := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "nim.opendatahub.io/v1",
			"kind":       "Account",
			"metadata":   map[string]interface{}{"name": "odh-nim-account"},
			"status": map[string]interface{}{
				"conditions": []interface{}{
					map[string]interface{}{
						"type":   "AccountStatus",
						"status": "True",
					},
					map[string]interface{}{
						"type":   "APIKeyValidation",
						"status": "True",
					},
				},
				"lastAccountCheck": "2025-01-15T10:00:00Z",
			},
		},
	}

	status := deriveStatusFromAccount(account)

	assert.True(t, status.IsInstalled)
	assert.True(t, status.IsEnabled)
	assert.False(t, status.CanInstall)
	assert.Equal(t, "True", status.VariablesValidationStatus)
	assert.Equal(t, "2025-01-15T10:00:00Z", status.VariablesValidationTimestamp)
	assert.Empty(t, status.Error)
}

func TestDeriveStatusFromAccount_DisabledWithError(t *testing.T) {
	account := &unstructured.Unstructured{
		Object: map[string]interface{}{
			"apiVersion": "nim.opendatahub.io/v1",
			"kind":       "Account",
			"metadata":   map[string]interface{}{"name": "odh-nim-account"},
			"status": map[string]interface{}{
				"conditions": []interface{}{
					map[string]interface{}{
						"type":    "AccountStatus",
						"status":  "False",
						"message": "API key expired",
					},
					map[string]interface{}{
						"type":   "APIKeyValidation",
						"status": "False",
					},
				},
			},
		},
	}

	status := deriveStatusFromAccount(account)

	assert.True(t, status.IsInstalled)
	assert.False(t, status.IsEnabled)
	assert.True(t, status.CanInstall)
	assert.Equal(t, "False", status.VariablesValidationStatus)
	assert.Equal(t, "API key expired", status.Error)
}

func TestIsNIMCRDNotInstalled_NilError(t *testing.T) {
	assert.False(t, isNIMCRDNotInstalled(nil))
}

func TestIsNIMCRDNotInstalled_MatchingError(t *testing.T) {
	err := &k8serrors.StatusError{
		ErrStatus: metav1.Status{
			Code:    404,
			Message: "404 page not found",
		},
	}
	assert.True(t, isNIMCRDNotInstalled(err))
}

func TestIsNIMCRDNotInstalled_DifferentNotFound(t *testing.T) {
	err := &k8serrors.StatusError{
		ErrStatus: metav1.Status{
			Code:    404,
			Message: "accounts.nim.opendatahub.io not found",
		},
	}
	assert.False(t, isNIMCRDNotInstalled(err))
}

func TestIsNIMCRDNotInstalled_NonStatusError(t *testing.T) {
	assert.False(t, isNIMCRDNotInstalled(assert.AnError))
}
