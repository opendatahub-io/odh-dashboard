package config

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPlatformType_Set_OpenShift(t *testing.T) {
	var p PlatformType
	assert.NoError(t, p.Set("OpenShift"))
	assert.Equal(t, PlatformOpenShift, p)
	assert.False(t, p.IsXKS())
}

func TestPlatformType_Set_XKS(t *testing.T) {
	var p PlatformType
	assert.NoError(t, p.Set("XKS"))
	assert.Equal(t, PlatformXKS, p)
	assert.True(t, p.IsXKS())
}

func TestPlatformType_Set_Empty(t *testing.T) {
	var p PlatformType
	assert.NoError(t, p.Set(""))
	assert.Equal(t, PlatformType(""), p)
	assert.False(t, p.IsXKS())
}

func TestPlatformType_Set_Invalid(t *testing.T) {
	var p PlatformType
	err := p.Set("invalid")
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "invalid platform type")
}

func TestPlatformType_String(t *testing.T) {
	assert.Equal(t, "OpenShift", PlatformOpenShift.String())
	assert.Equal(t, "XKS", PlatformXKS.String())
	assert.Equal(t, "", PlatformType("").String())
}
