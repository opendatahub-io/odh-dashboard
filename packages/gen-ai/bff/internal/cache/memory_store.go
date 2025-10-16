package cache

import (
	"fmt"
	"sync"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/constants"
	gocache "github.com/patrickmn/go-cache"
)

// MemoryStore provides a thread-safe, in-memory hierarchical key-value store.
// It's designed to be generic and can be used for caching tokens, sessions, or any ephemeral data.
// Structure: namespace -> username -> category -> key -> value
// Example: "crimson-demo" -> "user1" -> "access_tokens" -> "model-xyz" -> "token123"
type MemoryStore interface {
	// Set stores a value under namespace > username > category > key with optional TTL
	Set(namespace, username, category, key string, value interface{}, ttl time.Duration) error

	// Get retrieves a value from namespace > username > category > key
	Get(namespace, username, category, key string) (interface{}, bool)

	// Delete removes a specific key from namespace > username > category
	Delete(namespace, username, category, key string) error

	// DeleteCategory removes all keys in a category for a user in a namespace
	DeleteCategory(namespace, username, category string) error

	// DeleteUser removes all data for a user in a specific namespace
	DeleteUser(namespace, username string) error

	// DeleteNamespace removes all data in a namespace
	DeleteNamespace(namespace string) error

	// GetCategory retrieves all key-value pairs in a category for a user in a namespace
	GetCategory(namespace, username, category string) (map[string]interface{}, bool)

	// Clear removes all data from the store
	Clear()

	// Stats returns statistics about the cache
	Stats() StoreStats
}

// StoreStats provides statistics about the memory store
type StoreStats struct {
	TotalNamespaces int
	TotalUsers      int
	TotalCategories int
	TotalEntries    int
}

// inMemoryStore is the concrete implementation of MemoryStore using go-cache
type inMemoryStore struct {
	cache *gocache.Cache
	mu    sync.RWMutex // Protects metadata tracking only (cache is already thread-safe)

	// Lightweight tracking for stats (namespace -> user -> category -> key set)
	metadata map[string]map[string]map[string]map[string]struct{}
}

// NewMemoryStore creates a new in-memory store instance with default cleanup interval
func NewMemoryStore() MemoryStore {
	return &inMemoryStore{
		cache:    gocache.New(gocache.NoExpiration, constants.DefaultCleanupInterval),
		metadata: make(map[string]map[string]map[string]map[string]struct{}),
	}
}

// buildKey creates a composite key for the cache
func buildKey(namespace, username, category, key string) string {
	// Use :: separator for readability in debugging
	return fmt.Sprintf("%s::%s::%s::%s", namespace, username, category, key)
}

// Set stores a value under namespace > username > category > key with optional TTL
func (s *inMemoryStore) Set(namespace, username, category, key string, value interface{}, ttl time.Duration) error {
	if namespace == "" {
		return fmt.Errorf("namespace cannot be empty")
	}
	if username == "" {
		return fmt.Errorf("username cannot be empty")
	}
	if category == "" {
		return fmt.Errorf("category cannot be empty")
	}
	if key == "" {
		return fmt.Errorf("key cannot be empty")
	}

	// Store in cache FIRST (outside lock - go-cache is thread-safe)
	// This prevents a race where Get() could see metadata but miss cache
	compositeKey := buildKey(namespace, username, category, key)
	if ttl > 0 {
		s.cache.Set(compositeKey, value, ttl)
	} else {
		s.cache.Set(compositeKey, value, gocache.NoExpiration)
	}

	// Update metadata tracking AFTER cache (with write lock)
	// This ensures metadata only exists when cache entry exists
	s.mu.Lock()
	if s.metadata[namespace] == nil {
		s.metadata[namespace] = make(map[string]map[string]map[string]struct{})
	}
	if s.metadata[namespace][username] == nil {
		s.metadata[namespace][username] = make(map[string]map[string]struct{})
	}
	if s.metadata[namespace][username][category] == nil {
		s.metadata[namespace][username][category] = make(map[string]struct{})
	}
	s.metadata[namespace][username][category][key] = struct{}{}
	s.mu.Unlock()

	return nil
}

// Get retrieves a value from namespace > username > category > key
func (s *inMemoryStore) Get(namespace, username, category, key string) (interface{}, bool) {
	// Direct cache lookup (no lock needed - go-cache is thread-safe)
	compositeKey := buildKey(namespace, username, category, key)
	value, found := s.cache.Get(compositeKey)

	// Lazy cleanup: if not found in cache (expired), remove from metadata
	if !found {
		s.mu.Lock()
		s.cleanupMetadataHierarchy(namespace, username, category, key)
		s.mu.Unlock()
	}

	return value, found
}

// cleanupMetadataHierarchy removes empty metadata structures at different levels
// Progressively cleans up: key -> category -> user -> namespace
func (s *inMemoryStore) cleanupMetadataHierarchy(namespace, username, category, key string) {
	if s.metadata[namespace] == nil {
		return
	}

	// Remove key level
	if username != "" && category != "" && key != "" {
		if s.metadata[namespace][username] != nil &&
			s.metadata[namespace][username][category] != nil {
			delete(s.metadata[namespace][username][category], key)
		}
	}

	// Cleanup empty category
	if username != "" && category != "" {
		if s.metadata[namespace][username] != nil &&
			s.metadata[namespace][username][category] != nil &&
			len(s.metadata[namespace][username][category]) == 0 {
			delete(s.metadata[namespace][username], category)
		}
	}

	// Cleanup empty user
	if username != "" {
		if s.metadata[namespace][username] != nil &&
			len(s.metadata[namespace][username]) == 0 {
			delete(s.metadata[namespace], username)
		}
	}

	// Cleanup empty namespace
	if len(s.metadata[namespace]) == 0 {
		delete(s.metadata, namespace)
	}
}

// Delete removes a specific key from namespace > username > category
func (s *inMemoryStore) Delete(namespace, username, category, key string) error {
	// Remove from metadata (with write lock)
	s.mu.Lock()
	s.cleanupMetadataHierarchy(namespace, username, category, key)
	s.mu.Unlock()

	// Delete from cache (outside lock - go-cache is thread-safe)
	compositeKey := buildKey(namespace, username, category, key)
	s.cache.Delete(compositeKey)

	return nil
}

// DeleteCategory removes all keys in a category for a user in a namespace
func (s *inMemoryStore) DeleteCategory(namespace, username, category string) error {
	// Get keys to delete (with read lock)
	s.mu.RLock()
	var keysToDelete []string
	if s.metadata[namespace] != nil &&
		s.metadata[namespace][username] != nil &&
		s.metadata[namespace][username][category] != nil {
		for key := range s.metadata[namespace][username][category] {
			keysToDelete = append(keysToDelete, key)
		}
	}
	s.mu.RUnlock()

	// Delete from cache (no lock needed)
	for _, key := range keysToDelete {
		compositeKey := buildKey(namespace, username, category, key)
		s.cache.Delete(compositeKey)
	}

	// Update metadata (with write lock)
	s.mu.Lock()
	if s.metadata[namespace] != nil &&
		s.metadata[namespace][username] != nil {
		delete(s.metadata[namespace][username], category)

		// Cleanup empty structures
		if len(s.metadata[namespace][username]) == 0 {
			delete(s.metadata[namespace], username)
		}
		if len(s.metadata[namespace]) == 0 {
			delete(s.metadata, namespace)
		}
	}
	s.mu.Unlock()

	return nil
}

// DeleteUser removes all data for a user in a specific namespace
func (s *inMemoryStore) DeleteUser(namespace, username string) error {
	// Get keys to delete (with read lock)
	s.mu.RLock()
	var keysToDelete []string
	if s.metadata[namespace] != nil && s.metadata[namespace][username] != nil {
		for category, keys := range s.metadata[namespace][username] {
			for key := range keys {
				keysToDelete = append(keysToDelete, buildKey(namespace, username, category, key))
			}
		}
	}
	s.mu.RUnlock()

	// Delete from cache (no lock needed)
	for _, compositeKey := range keysToDelete {
		s.cache.Delete(compositeKey)
	}

	// Update metadata (with write lock)
	s.mu.Lock()
	if s.metadata[namespace] != nil {
		delete(s.metadata[namespace], username)

		// Cleanup empty namespace
		if len(s.metadata[namespace]) == 0 {
			delete(s.metadata, namespace)
		}
	}
	s.mu.Unlock()

	return nil
}

// DeleteNamespace removes all data in a namespace
func (s *inMemoryStore) DeleteNamespace(namespace string) error {
	// Get keys to delete (with read lock)
	s.mu.RLock()
	var keysToDelete []string
	if s.metadata[namespace] != nil {
		for username, users := range s.metadata[namespace] {
			for category, keys := range users {
				for key := range keys {
					keysToDelete = append(keysToDelete, buildKey(namespace, username, category, key))
				}
			}
		}
	}
	s.mu.RUnlock()

	// Delete from cache (no lock needed)
	for _, compositeKey := range keysToDelete {
		s.cache.Delete(compositeKey)
	}

	// Update metadata (with write lock)
	s.mu.Lock()
	delete(s.metadata, namespace)
	s.mu.Unlock()

	return nil
}

// GetCategory retrieves all key-value pairs in a category for a user in a namespace
func (s *inMemoryStore) GetCategory(namespace, username, category string) (map[string]interface{}, bool) {
	// Get keys from metadata (with read lock)
	s.mu.RLock()
	var keys []string
	if s.metadata[namespace] != nil &&
		s.metadata[namespace][username] != nil &&
		s.metadata[namespace][username][category] != nil {
		for key := range s.metadata[namespace][username][category] {
			keys = append(keys, key)
		}
	}
	s.mu.RUnlock()

	if len(keys) == 0 {
		return nil, false
	}

	// Fetch from cache and lazy cleanup expired entries (no lock needed - cache is thread-safe)
	result := make(map[string]interface{})
	expiredKeys := []string{}

	for _, key := range keys {
		compositeKey := buildKey(namespace, username, category, key)
		if cachedValue, found := s.cache.Get(compositeKey); found {
			result[key] = cachedValue
		} else {
			expiredKeys = append(expiredKeys, key)
		}
	}

	// Lazy cleanup of expired keys from metadata
	if len(expiredKeys) > 0 {
		s.mu.Lock()
		for _, key := range expiredKeys {
			s.cleanupMetadataHierarchy(namespace, username, category, key)
		}
		s.mu.Unlock()
	}

	if len(result) == 0 {
		return nil, false
	}

	return result, true
}

// Clear removes all data from the store
func (s *inMemoryStore) Clear() {
	s.mu.Lock()
	s.metadata = make(map[string]map[string]map[string]map[string]struct{})
	s.mu.Unlock()

	s.cache.Flush()
}

// Cleanup is a utility method to force immediate deletion of expired cache entries.
// Note: This is NOT part of the MemoryStore interface - it's a convenience method
// on the concrete inMemoryStore type. Cleanup happens automatically via the
// cleanupInterval configured in NewMemoryStore(), but this method allows forcing
// immediate cleanup when needed (e.g., for testing or manual cache maintenance).
func (s *inMemoryStore) Cleanup() {
	s.cache.DeleteExpired()
}

// Stats returns statistics about the cache
func (s *inMemoryStore) Stats() StoreStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := StoreStats{
		TotalNamespaces: len(s.metadata),
	}

	// Count users, categories, and entries from metadata
	for _, users := range s.metadata {
		stats.TotalUsers += len(users)
		for _, categories := range users {
			stats.TotalCategories += len(categories)
			for _, keys := range categories {
				stats.TotalEntries += len(keys)
			}
		}
	}

	return stats
}
