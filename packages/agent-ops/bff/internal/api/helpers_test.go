package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseURLTemplate(t *testing.T) {
	expected := "/v1/mod_arch/demo-registry/registered_models/111-222-333/versions"
	tmpl := "/v1/mod_arch/:mod_arch_id/registered_models/:registered_model_id/versions"
	params := map[string]string{"mod_arch_id": "demo-registry", "registered_model_id": "111-222-333"}

	actual := ParseURLTemplate(tmpl, params)

	assert.Equal(t, expected, actual)
}

func TestParseURLTemplateWhenEmpty(t *testing.T) {
	actual := ParseURLTemplate("", nil)
	assert.Empty(t, actual)
}
