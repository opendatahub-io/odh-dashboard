package models

import (
	"encoding/json"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestResponsesRequestUnmarshalJSON_NormalizesStringInput(t *testing.T) {
	var req ResponsesRequest
	err := json.Unmarshal([]byte(`{"model":"test-model","input":"hello"}`), &req)

	require.NoError(t, err)
	assert.True(t, req.HasInput())
	require.Len(t, req.Input, 1)
	assert.Equal(t, InputMessage{
		Type:    "message",
		Role:    "user",
		Content: []InputContent{{Type: "input_text", Text: "hello"}},
	}, req.Input[0])
}

func TestResponsesRequestUnmarshalJSONPreservesMessageArray(t *testing.T) {
	var req ResponsesRequest
	err := json.Unmarshal([]byte(`{"model":"test-model","input":[{"type":"message","role":"assistant","content":[{"type":"input_text","text":"hello"}]}]}`), &req)

	require.NoError(t, err)
	assert.True(t, req.HasInput())
	assert.Equal(t, []InputMessage{{
		Type:    "message",
		Role:    "assistant",
		Content: []InputContent{{Type: "input_text", Text: "hello"}},
	}}, req.Input)
}

func TestResponsesRequestUnmarshalJSONTreatsNullInputAsMissing(t *testing.T) {
	var req ResponsesRequest
	err := json.Unmarshal([]byte(`{"model":"test-model","input":null}`), &req)

	require.NoError(t, err)
	assert.False(t, req.HasInput())
	assert.Nil(t, req.Input)
}

func TestResponsesRequestUnmarshalJSONTracksOmittedInput(t *testing.T) {
	var req ResponsesRequest
	err := json.Unmarshal([]byte(`{"model":"test-model"}`), &req)

	require.NoError(t, err)
	assert.False(t, req.HasInput())
	assert.Nil(t, req.Input)
}
