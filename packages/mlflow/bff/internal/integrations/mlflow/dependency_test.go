package mlflow

import (
	"testing"

	"github.com/opendatahub-io/mlflow-go/mlflow/promptregistry"
	"github.com/stretchr/testify/assert"
)

func TestPromptModelConfigFieldExists(t *testing.T) {
	p := promptregistry.Prompt{}
	assert.Nil(t, p.ModelConfig)

	pv := promptregistry.PromptVersion{}
	assert.Nil(t, pv.ModelConfig)
}
