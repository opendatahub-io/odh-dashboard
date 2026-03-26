package maasmocks

import (
	"context"
	"testing"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations/maas"
	"github.com/opendatahub-io/gen-ai/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMockIssueToken_ValidSubscription(t *testing.T) {
	client := NewMockMaaSClient()

	resp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{
		Subscription: "premium-subscription",
	})

	require.NoError(t, err)
	assert.Equal(t, "sk-mock-premium-subscription-key", resp.Key)
	assert.NotEmpty(t, resp.ExpiresAt)
}

func TestMockIssueToken_EmptySubscription(t *testing.T) {
	client := NewMockMaaSClient()

	resp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{})

	require.NoError(t, err)
	assert.Equal(t, "sk-mock-api-key", resp.Key)
	assert.NotEmpty(t, resp.ExpiresAt)
}

func TestMockIssueToken_InvalidSubscription(t *testing.T) {
	client := NewMockMaaSClient()

	resp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{
		Subscription: "nonexistent-sub",
	})

	assert.Nil(t, resp)
	require.Error(t, err)

	maasErr, ok := err.(*maas.MaaSError)
	require.True(t, ok, "error should be a *maas.MaaSError")
	assert.Equal(t, maas.ErrCodeInvalidResponse, maasErr.Code)
	assert.Equal(t, 400, maasErr.StatusCode)
	assert.Contains(t, maasErr.Message, "invalid_subscription")
}

func TestMockIssueToken_DifferentSubscriptionsDifferentKeys(t *testing.T) {
	client := NewMockMaaSClient()

	basicResp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{
		Subscription: "basic-subscription",
	})
	require.NoError(t, err)

	premiumResp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{
		Subscription: "premium-subscription",
	})
	require.NoError(t, err)

	assert.NotEqual(t, basicResp.Key, premiumResp.Key)
	assert.Equal(t, "sk-mock-basic-subscription-key", basicResp.Key)
	assert.Equal(t, "sk-mock-premium-subscription-key", premiumResp.Key)
}

func TestMockIssueToken_RespectsExpiresIn(t *testing.T) {
	client := NewMockMaaSClient()

	before := time.Now()
	resp, err := client.IssueToken(context.Background(), models.MaaSTokenRequest{
		ExpiresIn:    "30m",
		Subscription: "basic-subscription",
	})

	require.NoError(t, err)
	assert.Equal(t, "sk-mock-basic-subscription-key", resp.Key)

	expiresAt, parseErr := time.Parse(time.RFC3339, resp.ExpiresAt)
	require.NoError(t, parseErr, "ExpiresAt should be valid RFC3339")
	assert.WithinDuration(t, before.Add(30*time.Minute), expiresAt, 5*time.Second)
}
