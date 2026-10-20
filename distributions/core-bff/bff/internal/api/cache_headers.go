package api

import (
	"path/filepath"
	"regexp"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
)

// Matches Node backend/src/utils/cacheHeaders.ts.
// RE2 has no lookahead, so hash detection is: [.-] + 8+ hex, then require at least one a-f
// (same as Node's /[.-](?=[0-9a-f]*[a-f])[0-9a-f]{8,}/).
var (
	hashCandidatePattern = regexp.MustCompile(`[.-]([0-9a-f]{8,})`)
	staticAssetPattern   = regexp.MustCompile(`(?i)\.(woff2?|ttf|eot|png|jpe?g|gif|svg|ico|webp|avif|bmp)$`)
)

func isHashedAsset(filePath string) bool {
	base := filepath.Base(filePath)
	for _, match := range hashCandidatePattern.FindAllStringSubmatch(base, -1) {
		if strings.ContainsAny(match[1], "abcdef") {
			return true
		}
	}
	return false
}

func isStaticAsset(filePath string) bool {
	return staticAssetPattern.MatchString(filePath)
}

// getCacheControlForStaticFile returns Cache-Control for a host static file path
// (Node getCacheControlForStaticFile parity).
func getCacheControlForStaticFile(filePath string) string {
	if isHashedAsset(filePath) {
		return constants.CacheControlImmutable
	}
	if isStaticAsset(filePath) {
		return constants.CacheControlShort
	}
	return constants.CacheControlNo
}
