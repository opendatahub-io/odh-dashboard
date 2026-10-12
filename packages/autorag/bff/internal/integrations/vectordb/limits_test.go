package vectordb

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateResultTextSizeEnforcesPerResultAndTotalLimits(t *testing.T) {
	total, err := validateResultTextSize(0, strings.Repeat("x", MaxVectorResultBytes))
	require.NoError(t, err)
	assert.Equal(t, MaxVectorResultBytes, total)

	_, err = validateResultTextSize(0, strings.Repeat("x", MaxVectorResultBytes+1))
	assert.ErrorIs(t, err, ErrResultContentLimit)

	_, err = validateResultTextSize(MaxVectorResultTotalBytes-1, "xx")
	assert.ErrorIs(t, err, ErrResultContentLimit)
}
