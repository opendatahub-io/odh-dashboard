package repositories

import (
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"testing"

	k8s "github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/integrations/kubernetes"
	"github.com/stretchr/testify/assert"
)

func TestHasSystemAuthenticatedGroup_Present(t *testing.T) {
	auth := &AuthConfig{
		AllowedGroups: []string{"some-group", systemAuthenticated},
	}
	assert.True(t, hasSystemAuthenticatedGroup(auth))
}

func TestHasSystemAuthenticatedGroup_Absent(t *testing.T) {
	auth := &AuthConfig{
		AllowedGroups: []string{"some-group", "another-group"},
	}
	assert.False(t, hasSystemAuthenticatedGroup(auth))
}

func TestHasSystemAuthenticatedGroup_Empty(t *testing.T) {
	auth := &AuthConfig{
		AllowedGroups: []string{},
	}
	assert.False(t, hasSystemAuthenticatedGroup(auth))
}

func TestHasSystemAuthenticatedGroup_Nil(t *testing.T) {
	assert.False(t, hasSystemAuthenticatedGroup(nil))
}

func TestHasSystemAuthenticatedGroup_OnlySystemAuthenticated(t *testing.T) {
	auth := &AuthConfig{
		AllowedGroups: []string{systemAuthenticated},
	}
	assert.True(t, hasSystemAuthenticatedGroup(auth))
}

func expectedSHA256(s string) string {
	h := sha256.Sum256([]byte(s))
	return hex.EncodeToString(h[:])
}

func fakeJWT(sub string) string {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf(`{"sub":"%s","iss":"test"}`, sub)))
	return header + "." + payload + ".signature"
}

func TestSha256Hex(t *testing.T) {
	result := sha256Hex("hello")
	assert.Len(t, result, 64)
	assert.Equal(t, expectedSHA256("hello"), result)
}

func TestJwtSubClaim_ValidJWT(t *testing.T) {
	token := fakeJWT("user-uuid-123")
	assert.Equal(t, "user-uuid-123", jwtSubClaim(token))
}

func TestJwtSubClaim_NotAJWT(t *testing.T) {
	assert.Equal(t, "", jwtSubClaim("not-a-jwt"))
}

func TestJwtSubClaim_EmptyToken(t *testing.T) {
	assert.Equal(t, "", jwtSubClaim(""))
}

func TestJwtSubClaim_NoSubClaim(t *testing.T) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"RS256"}`))
	payload := base64.RawURLEncoding.EncodeToString([]byte(`{"iss":"test"}`))
	token := header + "." + payload + ".sig"
	assert.Equal(t, "", jwtSubClaim(token))
}

func TestSegmentUserID_WithJWTSub(t *testing.T) {
	token := k8s.NewBearerToken(fakeJWT("user-uuid-123"))
	result := segmentUserID(token, "some-username")
	assert.Equal(t, expectedSHA256("user-uuid-123"), result)
}

func TestSegmentUserID_NonJWT_FallsToHashedUsername(t *testing.T) {
	token := k8s.NewBearerToken("not-a-jwt-token")
	result := segmentUserID(token, "admin-user")
	assert.Equal(t, expectedSHA256("admin-user"), result)
}

func TestSegmentUserID_EmptyTokenAndUsername(t *testing.T) {
	token := k8s.NewBearerToken("")
	assert.Equal(t, "", segmentUserID(token, ""))
}

func TestSegmentUserID_JWTPreferredOverUsername(t *testing.T) {
	token := k8s.NewBearerToken(fakeJWT("jwt-sub-value"))
	jwtResult := segmentUserID(token, "fallback-user")
	usernameResult := expectedSHA256("fallback-user")
	assert.NotEqual(t, usernameResult, jwtResult)
	assert.Equal(t, expectedSHA256("jwt-sub-value"), jwtResult)
}
