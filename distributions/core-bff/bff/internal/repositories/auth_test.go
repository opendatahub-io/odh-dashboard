package repositories

import (
	"testing"

	"github.com/stretchr/testify/assert"
	k8serrors "k8s.io/apimachinery/pkg/api/errors"
	"k8s.io/apimachinery/pkg/runtime/schema"
)

func TestGetAuth_ErrorClassification(t *testing.T) {
	// 404 (NotFound) means the CRD exists but the "auth" instance is missing.
	// This should NOT be treated as CRD absent - it should return an error
	// so resolveIsAllowed falls through to SSAR instead of granting access.
	notFound := k8serrors.NewNotFound(schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}, "auth")
	assert.True(t, k8serrors.IsNotFound(notFound))
	assert.False(t, isDiscoveryError(notFound))

	// 403 (Forbidden) should NOT be treated as CRD absent
	forbidden := k8serrors.NewForbidden(schema.GroupResource{Group: "services.platform.opendatahub.io", Resource: "auths"}, "auth", nil)
	assert.True(t, k8serrors.IsForbidden(forbidden))
	assert.False(t, isDiscoveryError(forbidden))
}

func TestGetAuth_ParsesAuthConfig(t *testing.T) {
	spec := map[string]interface{}{
		"adminGroups":   []interface{}{"admin-group-1", "admin-group-2"},
		"allowedGroups": []interface{}{"system:authenticated", "allowed-group"},
	}

	auth := &AuthConfig{}
	if groups, ok := spec["adminGroups"].([]interface{}); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AdminGroups = append(auth.AdminGroups, s)
			}
		}
	}
	if groups, ok := spec["allowedGroups"].([]interface{}); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AllowedGroups = append(auth.AllowedGroups, s)
			}
		}
	}

	assert.Equal(t, []string{"admin-group-1", "admin-group-2"}, auth.AdminGroups)
	assert.Equal(t, []string{"system:authenticated", "allowed-group"}, auth.AllowedGroups)
}

func TestGetAuth_EmptySpec(t *testing.T) {
	spec := map[string]interface{}{}

	auth := &AuthConfig{}
	if groups, ok := spec["adminGroups"].([]interface{}); ok {
		for _, g := range groups {
			if s, ok := g.(string); ok {
				auth.AdminGroups = append(auth.AdminGroups, s)
			}
		}
	}

	assert.Nil(t, auth.AdminGroups)
	assert.Nil(t, auth.AllowedGroups)
}
