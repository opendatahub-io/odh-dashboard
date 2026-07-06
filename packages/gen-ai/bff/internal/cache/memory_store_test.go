package cache

import (
	"fmt"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TokenEntry is an example value type for testing
type TokenEntry struct {
	Token     string
	ExpiresAt int64
}

// IsExpired checks if the token has expired
func (t *TokenEntry) IsExpired() bool {
	return time.Now().Unix() > t.ExpiresAt
}

func TestMemoryStore_SetAndGet(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should store and retrieve value", func(t *testing.T) {
		token := &TokenEntry{
			Token:     "test-token-123",
			ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
		}

		err := store.Set(namespace, "user1", "access_tokens", "model-xyz", token, 0)
		require.NoError(t, err)

		value, found := store.Get(namespace, "user1", "access_tokens", "model-xyz")
		assert.True(t, found)
		assert.NotNil(t, value)

		retrievedToken := value.(*TokenEntry)
		assert.Equal(t, "test-token-123", retrievedToken.Token)
		assert.Equal(t, token.ExpiresAt, retrievedToken.ExpiresAt)
	})

	t.Run("should handle multiple users", func(t *testing.T) {
		store.Clear()

		token1 := &TokenEntry{Token: "user1-token", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		token2 := &TokenEntry{Token: "user2-token", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", token1, 0))
		require.NoError(t, store.Set(namespace, "user2", "access_tokens", "model-a", token2, 0))

		value1, found1 := store.Get(namespace, "user1", "access_tokens", "model-a")
		value2, found2 := store.Get(namespace, "user2", "access_tokens", "model-a")

		assert.True(t, found1)
		assert.True(t, found2)
		assert.Equal(t, "user1-token", value1.(*TokenEntry).Token)
		assert.Equal(t, "user2-token", value2.(*TokenEntry).Token)
	})

	t.Run("should handle multiple categories per user", func(t *testing.T) {
		store.Clear()

		accessToken := &TokenEntry{Token: "access-123", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		refreshToken := &TokenEntry{Token: "refresh-456", ExpiresAt: time.Now().Add(24 * time.Hour).Unix()}

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", accessToken, 0))
		require.NoError(t, store.Set(namespace, "user1", "refresh_tokens", "model-a", refreshToken, 0))

		access, foundAccess := store.Get(namespace, "user1", "access_tokens", "model-a")
		refresh, foundRefresh := store.Get(namespace, "user1", "refresh_tokens", "model-a")

		assert.True(t, foundAccess)
		assert.True(t, foundRefresh)
		assert.Equal(t, "access-123", access.(*TokenEntry).Token)
		assert.Equal(t, "refresh-456", refresh.(*TokenEntry).Token)
	})

	t.Run("should handle multiple models per user", func(t *testing.T) {
		store.Clear()

		tokenA := &TokenEntry{Token: "token-model-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		tokenB := &TokenEntry{Token: "token-model-b", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", tokenA, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-b", tokenB, 0))

		valueA, foundA := store.Get(namespace, "user1", "access_tokens", "model-a")
		valueB, foundB := store.Get(namespace, "user1", "access_tokens", "model-b")

		assert.True(t, foundA)
		assert.True(t, foundB)
		assert.Equal(t, "token-model-a", valueA.(*TokenEntry).Token)
		assert.Equal(t, "token-model-b", valueB.(*TokenEntry).Token)
	})
}

func TestMemoryStore_Expiration(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should expire entries after TTL", func(t *testing.T) {
		token := &TokenEntry{
			Token:     "short-lived-token",
			ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
		}

		// Set with 200ms TTL
		err := store.Set(namespace, "user1", "access_tokens", "model-xyz", token, 200*time.Millisecond)
		require.NoError(t, err)

		// Should exist immediately
		value, found := store.Get(namespace, "user1", "access_tokens", "model-xyz")
		assert.True(t, found)
		assert.NotNil(t, value)

		// Wait for expiration
		time.Sleep(300 * time.Millisecond)

		// Should be expired
		value, found = store.Get(namespace, "user1", "access_tokens", "model-xyz")
		assert.False(t, found)
		assert.Nil(t, value)
	})

	t.Run("should keep non-expiring entries", func(t *testing.T) {
		store.Clear()

		token := &TokenEntry{
			Token:     "persistent-token",
			ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
		}

		// Set with no expiration
		err := store.Set(namespace, "user1", "access_tokens", "model-xyz", token, 0)
		require.NoError(t, err)

		time.Sleep(200 * time.Millisecond)

		// Should still exist
		value, found := store.Get(namespace, "user1", "access_tokens", "model-xyz")
		assert.True(t, found)
		assert.Equal(t, "persistent-token", value.(*TokenEntry).Token)
	})
}

func TestMemoryStore_Delete(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should delete specific key", func(t *testing.T) {
		store.Clear()

		token := &TokenEntry{Token: "token-123", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", token, 0))

		// Verify it exists
		_, found := store.Get(namespace, "user1", "access_tokens", "model-a")
		assert.True(t, found)

		// Delete it
		err := store.Delete(namespace, "user1", "access_tokens", "model-a")
		require.NoError(t, err)

		// Verify it's gone
		_, found = store.Get(namespace, "user1", "access_tokens", "model-a")
		assert.False(t, found)
	})

	t.Run("should delete category", func(t *testing.T) {
		store.Clear()

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-b", &TokenEntry{Token: "token-b", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "refresh_tokens", "model-a", &TokenEntry{Token: "refresh-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		// Delete access_tokens category
		err := store.DeleteCategory(namespace, "user1", "access_tokens")
		require.NoError(t, err)

		// Verify access_tokens are gone
		_, foundA := store.Get(namespace, "user1", "access_tokens", "model-a")
		_, foundB := store.Get(namespace, "user1", "access_tokens", "model-b")
		assert.False(t, foundA)
		assert.False(t, foundB)

		// Verify refresh_tokens still exist
		_, foundRefresh := store.Get(namespace, "user1", "refresh_tokens", "model-a")
		assert.True(t, foundRefresh)
	})

	t.Run("should delete all user data", func(t *testing.T) {
		store.Clear()

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "refresh_tokens", "model-a", &TokenEntry{Token: "refresh-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		err := store.DeleteUser(namespace, "user1")
		require.NoError(t, err)

		// Verify all data is gone
		_, found1 := store.Get(namespace, "user1", "access_tokens", "model-a")
		_, found2 := store.Get(namespace, "user1", "refresh_tokens", "model-a")
		assert.False(t, found1)
		assert.False(t, found2)
	})
}

func TestMemoryStore_GetCategory(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should retrieve all keys in category", func(t *testing.T) {
		store.Clear()

		tokenA := &TokenEntry{Token: "token-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		tokenB := &TokenEntry{Token: "token-b", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		tokenC := &TokenEntry{Token: "token-c", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}

		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", tokenA, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-b", tokenB, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-c", tokenC, 0))

		category, found := store.GetCategory(namespace, "user1", "access_tokens")
		assert.True(t, found)
		assert.Len(t, category, 3)
		assert.Contains(t, category, "model-a")
		assert.Contains(t, category, "model-b")
		assert.Contains(t, category, "model-c")
	})

	t.Run("should return false for non-existent category", func(t *testing.T) {
		store.Clear()

		category, found := store.GetCategory(namespace, "user1", "non-existent")
		assert.False(t, found)
		assert.Nil(t, category)
	})
}

func TestMemoryStore_Validation(t *testing.T) {
	store := NewMemoryStore()

	t.Run("should reject empty namespace", func(t *testing.T) {
		err := store.Set("", "user1", "category", "key", "value", 0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "namespace cannot be empty")
	})

	t.Run("should reject empty username", func(t *testing.T) {
		err := store.Set("test-namespace", "", "category", "key", "value", 0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "username cannot be empty")
	})

	t.Run("should reject empty category", func(t *testing.T) {
		err := store.Set("test-namespace", "user1", "", "key", "value", 0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "category cannot be empty")
	})

	t.Run("should reject empty key", func(t *testing.T) {
		err := store.Set("test-namespace", "user1", "category", "", "value", 0)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "key cannot be empty")
	})
}

func TestMemoryStore_Stats(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should return correct statistics", func(t *testing.T) {
		store.Clear()

		// Add data for 2 users
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", &TokenEntry{Token: "t1", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-b", &TokenEntry{Token: "t2", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "refresh_tokens", "model-a", &TokenEntry{Token: "r1", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		require.NoError(t, store.Set(namespace, "user2", "access_tokens", "model-x", &TokenEntry{Token: "t3", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		stats := store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces, "should have 1 namespace")
		assert.Equal(t, 2, stats.TotalUsers, "should have 2 users")
		assert.Equal(t, 3, stats.TotalCategories, "should have 3 categories total")
		assert.Equal(t, 4, stats.TotalEntries, "should have 4 entries total")
	})

	t.Run("should return zero stats for empty store", func(t *testing.T) {
		store.Clear()

		stats := store.Stats()
		assert.Equal(t, 0, stats.TotalNamespaces)
		assert.Equal(t, 0, stats.TotalUsers)
		assert.Equal(t, 0, stats.TotalCategories)
		assert.Equal(t, 0, stats.TotalEntries)
	})
}

func TestMemoryStore_Clear(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should clear all data", func(t *testing.T) {
		// Add some data
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", &TokenEntry{Token: "t1", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user2", "access_tokens", "model-b", &TokenEntry{Token: "t2", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		// Verify data exists
		stats := store.Stats()
		assert.Greater(t, stats.TotalEntries, 0)

		// Clear
		store.Clear()

		// Verify all gone
		stats = store.Stats()
		assert.Equal(t, 0, stats.TotalEntries)

		_, found1 := store.Get(namespace, "user1", "access_tokens", "model-a")
		_, found2 := store.Get(namespace, "user2", "access_tokens", "model-b")
		assert.False(t, found1)
		assert.False(t, found2)
	})
}

// TestMemoryStore_MaaSTokenScenario tests the specific use case for MaaS tokens
func TestMemoryStore_MaaSTokenScenario(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should handle MaaS token caching scenario", func(t *testing.T) {
		store.Clear()

		// Simulate storing tokens for different models
		watsonxToken := &TokenEntry{
			Token:     "watsonx-token-xyz",
			ExpiresAt: time.Now().Add(4 * time.Hour).Unix(),
		}
		azureToken := &TokenEntry{
			Token:     "azure-token-abc",
			ExpiresAt: time.Now().Add(4 * time.Hour).Unix(),
		}

		// User "alice" has tokens for two MaaS models
		err := store.Set(namespace, "alice", "access_tokens", "maas-watsonx-granite", watsonxToken, 4*time.Hour)
		require.NoError(t, err)

		err = store.Set(namespace, "alice", "access_tokens", "maas-azure-gpt4", azureToken, 4*time.Hour)
		require.NoError(t, err)

		// Retrieve tokens
		retrievedWatsonx, found := store.Get(namespace, "alice", "access_tokens", "maas-watsonx-granite")
		assert.True(t, found)
		assert.Equal(t, "watsonx-token-xyz", retrievedWatsonx.(*TokenEntry).Token)

		retrievedAzure, found := store.Get(namespace, "alice", "access_tokens", "maas-azure-gpt4")
		assert.True(t, found)
		assert.Equal(t, "azure-token-abc", retrievedAzure.(*TokenEntry).Token)

		// Get all access tokens for alice
		allTokens, found := store.GetCategory(namespace, "alice", "access_tokens")
		assert.True(t, found)
		assert.Len(t, allTokens, 2)
	})

	t.Run("should handle concurrent access", func(t *testing.T) {
		store.Clear()

		done := make(chan bool, 10)

		// Simulate 10 concurrent goroutines accessing the store
		for i := 0; i < 10; i++ {
			go func(id int) {
				defer func() { done <- true }()

				username := fmt.Sprintf("user%d", id)
				token := &TokenEntry{
					Token:     fmt.Sprintf("token-%d", id),
					ExpiresAt: time.Now().Add(1 * time.Hour).Unix(),
				}

				// Set
				err := store.Set(namespace, username, "access_tokens", "model-a", token, 0)
				require.NoError(t, err)

				// Get
				value, found := store.Get(namespace, username, "access_tokens", "model-a")
				assert.True(t, found)
				assert.Equal(t, fmt.Sprintf("token-%d", id), value.(*TokenEntry).Token)
			}(i)
		}

		// Wait for all goroutines
		for i := 0; i < 10; i++ {
			<-done
		}

		// Verify all users have data
		stats := store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces)
		assert.Equal(t, 10, stats.TotalUsers)
	})
}

func TestMemoryStore_UpdateExistingValue(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should update existing value", func(t *testing.T) {
		store.Clear()

		// Set initial value
		token1 := &TokenEntry{Token: "old-token", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		err := store.Set(namespace, "user1", "access_tokens", "model-a", token1, 0)
		require.NoError(t, err)

		// Update with new value
		token2 := &TokenEntry{Token: "new-token", ExpiresAt: time.Now().Add(2 * time.Hour).Unix()}
		err = store.Set(namespace, "user1", "access_tokens", "model-a", token2, 0)
		require.NoError(t, err)

		// Verify new value
		value, found := store.Get(namespace, "user1", "access_tokens", "model-a")
		assert.True(t, found)
		assert.Equal(t, "new-token", value.(*TokenEntry).Token)
	})
}

func TestMemoryStore_MetadataCleanupHierarchy(t *testing.T) {
	store := NewMemoryStore()
	namespace := "test-namespace"

	t.Run("should cleanup empty structures after delete", func(t *testing.T) {
		store.Clear()

		// Add single entry
		token := &TokenEntry{Token: "test-token", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", token, 0))

		// Verify stats show the entry
		stats := store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces)
		assert.Equal(t, 1, stats.TotalUsers)
		assert.Equal(t, 1, stats.TotalCategories)
		assert.Equal(t, 1, stats.TotalEntries)

		// Delete the entry
		err := store.Delete(namespace, "user1", "access_tokens", "model-a")
		require.NoError(t, err)

		// Verify stats show everything cleaned up (empty structures removed)
		stats = store.Stats()
		assert.Equal(t, 0, stats.TotalNamespaces, "namespace should be cleaned up when empty")
		assert.Equal(t, 0, stats.TotalUsers, "user should be cleaned up when empty")
		assert.Equal(t, 0, stats.TotalCategories, "category should be cleaned up when empty")
		assert.Equal(t, 0, stats.TotalEntries, "entries should be 0")
	})

	t.Run("should cleanup only empty structures", func(t *testing.T) {
		store.Clear()

		// Add multiple entries in different categories
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set(namespace, "user1", "refresh_tokens", "model-a", &TokenEntry{Token: "refresh-a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		stats := store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces)
		assert.Equal(t, 1, stats.TotalUsers)
		assert.Equal(t, 2, stats.TotalCategories)
		assert.Equal(t, 2, stats.TotalEntries)

		// Delete one category
		err := store.Delete(namespace, "user1", "access_tokens", "model-a")
		require.NoError(t, err)

		// Verify category is cleaned up but user/namespace remain (because refresh_tokens still exists)
		stats = store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces, "namespace should remain")
		assert.Equal(t, 1, stats.TotalUsers, "user should remain")
		assert.Equal(t, 1, stats.TotalCategories, "only empty category should be removed")
		assert.Equal(t, 1, stats.TotalEntries)
	})

	t.Run("should cleanup metadata on lazy expiration in Get", func(t *testing.T) {
		store.Clear()

		// Add short-lived entry
		token := &TokenEntry{Token: "short-lived", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", token, 100*time.Millisecond))

		// Verify stats show the entry
		stats := store.Stats()
		assert.Equal(t, 1, stats.TotalEntries)

		// Wait for expiration
		time.Sleep(200 * time.Millisecond)

		// Get should trigger lazy cleanup
		_, found := store.Get(namespace, "user1", "access_tokens", "model-a")
		assert.False(t, found, "entry should be expired")

		// Verify stats show cleanup happened (metadata removed)
		stats = store.Stats()
		assert.Equal(t, 0, stats.TotalNamespaces, "expired entry should trigger metadata cleanup")
		assert.Equal(t, 0, stats.TotalEntries)
	})

	t.Run("should cleanup metadata for expired entries in GetCategory", func(t *testing.T) {
		store.Clear()

		// Add one non-expiring and one short-lived entry
		tokenA := &TokenEntry{Token: "permanent", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		tokenB := &TokenEntry{Token: "short-lived", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-a", tokenA, 0))
		require.NoError(t, store.Set(namespace, "user1", "access_tokens", "model-b", tokenB, 100*time.Millisecond))

		// Verify stats
		stats := store.Stats()
		assert.Equal(t, 2, stats.TotalEntries)

		// Wait for one to expire
		time.Sleep(200 * time.Millisecond)

		// GetCategory should return only non-expired and cleanup metadata for expired
		category, found := store.GetCategory(namespace, "user1", "access_tokens")
		assert.True(t, found)
		assert.Len(t, category, 1, "should only return non-expired entry")
		assert.Contains(t, category, "model-a")
		assert.NotContains(t, category, "model-b")

		// Verify stats reflect the cleanup
		stats = store.Stats()
		assert.Equal(t, 1, stats.TotalEntries, "expired entry should be cleaned from metadata")
	})

	t.Run("should handle multiple namespaces cleanup independently", func(t *testing.T) {
		store.Clear()

		// Add entries in different namespaces
		require.NoError(t, store.Set("namespace-1", "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-1", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set("namespace-2", "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-2", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		stats := store.Stats()
		assert.Equal(t, 2, stats.TotalNamespaces)
		assert.Equal(t, 2, stats.TotalEntries)

		// Delete from namespace-1
		err := store.Delete("namespace-1", "user1", "access_tokens", "model-a")
		require.NoError(t, err)

		// Verify namespace-1 is cleaned up but namespace-2 remains
		stats = store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces, "only namespace-1 should be cleaned up")
		assert.Equal(t, 1, stats.TotalEntries)

		// Verify namespace-2 data still accessible
		value, found := store.Get("namespace-2", "user1", "access_tokens", "model-a")
		assert.True(t, found)
		assert.Equal(t, "token-2", value.(*TokenEntry).Token)
	})
}

func TestMemoryStore_DeleteNamespace(t *testing.T) {
	store := NewMemoryStore()

	t.Run("should delete entire namespace", func(t *testing.T) {
		store.Clear()

		// Add multiple users and categories in one namespace
		require.NoError(t, store.Set("namespace-1", "user1", "access_tokens", "model-a", &TokenEntry{Token: "token-1a", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set("namespace-1", "user1", "refresh_tokens", "model-b", &TokenEntry{Token: "token-1b", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set("namespace-1", "user2", "access_tokens", "model-c", &TokenEntry{Token: "token-1c", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))
		require.NoError(t, store.Set("namespace-2", "user1", "access_tokens", "model-d", &TokenEntry{Token: "token-2d", ExpiresAt: time.Now().Add(1 * time.Hour).Unix()}, 0))

		stats := store.Stats()
		assert.Equal(t, 2, stats.TotalNamespaces)
		assert.Equal(t, 4, stats.TotalEntries)

		// Delete namespace-1
		err := store.DeleteNamespace("namespace-1")
		require.NoError(t, err)

		// Verify namespace-1 data is all gone
		_, found1 := store.Get("namespace-1", "user1", "access_tokens", "model-a")
		_, found2 := store.Get("namespace-1", "user1", "refresh_tokens", "model-b")
		_, found3 := store.Get("namespace-1", "user2", "access_tokens", "model-c")
		assert.False(t, found1)
		assert.False(t, found2)
		assert.False(t, found3)

		// Verify namespace-2 data still exists
		value, found4 := store.Get("namespace-2", "user1", "access_tokens", "model-d")
		assert.True(t, found4)
		assert.Equal(t, "token-2d", value.(*TokenEntry).Token)

		// Verify stats
		stats = store.Stats()
		assert.Equal(t, 1, stats.TotalNamespaces, "only namespace-2 should remain")
		assert.Equal(t, 1, stats.TotalEntries)
	})

	t.Run("should handle deleting non-existent namespace", func(t *testing.T) {
		store.Clear()

		err := store.DeleteNamespace("non-existent-namespace")
		require.NoError(t, err, "deleting non-existent namespace should not error")

		stats := store.Stats()
		assert.Equal(t, 0, stats.TotalNamespaces)
	})
}
