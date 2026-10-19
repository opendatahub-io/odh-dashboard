package api

import (
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/assert"
)

func TestIsHashedAsset(t *testing.T) {
	hashed := []string{
		"app.a1b2c3d4e5f6.bundle.js",
		"chunk-vendors-abcdef0123456789.js",
		"app.1234abcd5678.css",
		"some-chunk.a1b2c3d4e5f6.bundle.css",
		"1013-4cee0676a66ac829f875.js",
	}
	for _, name := range hashed {
		t.Run(name, func(t *testing.T) {
			assert.True(t, isHashedAsset(name))
		})
	}

	nonHashed := []string{
		"index.html",
		"favicon.ico",
		"manifest.json",
		"robots.txt",
		"remoteEntry.js",
		"images/logo.png",
		"fonts/RedHatDisplay-Regular.woff2",
		"locales/en/translation.json",
		"app.bundle.js",
		"app.css",
		"images/logo-20240608.png",
		"fonts/asset-20240608.woff2",
	}
	for _, name := range nonHashed {
		t.Run(name, func(t *testing.T) {
			assert.False(t, isHashedAsset(name))
		})
	}
}

func TestIsStaticAsset(t *testing.T) {
	static := []string{
		"favicon.ico",
		"images/logo.png",
		"images/photo.jpg",
		"images/photo.jpeg",
		"images/icon.svg",
		"images/banner.webp",
		"images/bg.gif",
		"fonts/RedHatDisplay-Regular.woff2",
		"fonts/RedHatText.woff",
		"fonts/mono.ttf",
		"fonts/legacy.eot",
	}
	for _, name := range static {
		t.Run(name, func(t *testing.T) {
			assert.True(t, isStaticAsset(name))
		})
	}

	nonStatic := []string{
		"app.bundle.js",
		"app.css",
		"index.html",
		"remoteEntry.js",
		"manifest.json",
		"robots.txt",
		"locales/en/translation.json",
	}
	for _, name := range nonStatic {
		t.Run(name, func(t *testing.T) {
			assert.False(t, isStaticAsset(name))
		})
	}
}

func TestGetCacheControlForStaticFile(t *testing.T) {
	assert.Equal(t, constants.CacheControlImmutable, getCacheControlForStaticFile("app.a1b2c3d4.bundle.js"))

	assert.Equal(t, constants.CacheControlShort, getCacheControlForStaticFile("favicon.ico"))
	assert.Equal(t, constants.CacheControlShort, getCacheControlForStaticFile("fonts/RedHatDisplay.woff2"))
	assert.Equal(t, constants.CacheControlShort, getCacheControlForStaticFile("images/logo.png"))
	assert.Equal(t, constants.CacheControlShort, getCacheControlForStaticFile("images/logo-20240608.png"))
	assert.Equal(t, constants.CacheControlShort, getCacheControlForStaticFile("fonts/asset-20240608.woff2"))

	assert.Equal(t, constants.CacheControlNo, getCacheControlForStaticFile("remoteEntry.js"))
	assert.Equal(t, constants.CacheControlNo, getCacheControlForStaticFile("locales/en/translation.json"))
	assert.Equal(t, constants.CacheControlNo, getCacheControlForStaticFile("manifest.json"))
}
