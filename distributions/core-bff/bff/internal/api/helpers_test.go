package api

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestParseURLTemplate(t *testing.T) {
	expected := "/v1/core/demo-resource/items/111-222-333/versions"
	tmpl := "/v1/core/:resource_id/items/:item_id/versions"
	params := map[string]string{"resource_id": "demo-resource", "item_id": "111-222-333"}

	actual := ParseURLTemplate(tmpl, params)

	assert.Equal(t, expected, actual)
}

func TestParseURLTemplateWhenEmpty(t *testing.T) {
	actual := ParseURLTemplate("", nil)
	assert.Empty(t, actual)
}
