package cache

import (
	"fmt"
	"sync"
	"time"

	gocache "github.com/patrickmn/go-cache"
)

// MemoryStore provides a thread-safe, in-memory hierarchical key-value store.
// It's designed to be generic and can be used for caching tokens, sessions, or any ephemeral data.
// Structure: namespace -> username -> category -> key -> value
// Example: "crimson-show" -> "user1" -> "access_tokens" -> "model-xyz" -> TokenEntry{Token: "abc", ExpiresAt: 123456}
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
	mu    sync.RWMutex // Protects nested map access
}

// categoryData represents a category with its key-value pairs
type categoryData struct {
	Items map[string]interface{} `json:"items"`
}

// userData represents a user's data with categories
type userData struct {
	Categories map[string]*categoryData `json:"categories"`
}

// namespaceData represents a namespace with users
type namespaceData struct {
	Users map[string]*userData `json:"users"`
}

// NewMemoryStore creates a new in-memory store instance
// cleanupInterval: how often to check for expired items (e.g., 10 * time.Minute)
func NewMemoryStore(cleanupInterval time.Duration) MemoryStore {
	return &inMemoryStore{
		cache: gocache.New(gocache.NoExpiration, cleanupInterval),
	}
}

// NewMemoryStoreWithDefaults creates a store with sensible defaults (10 minute cleanup)
func NewMemoryStoreWithDefaults() MemoryStore {
	return NewMemoryStore(10 * time.Minute)
}

// buildKey creates a composite key for the cache
func buildKey(namespace, username, category, key string) string {
	// Use :: separator for readability in debugging
	return fmt.Sprintf("%s::%s::%s::%s", namespace, username, category, key)
}

// getNamespaceKey creates a key for namespace-level data
func getNamespaceKey(namespace string) string {
	return fmt.Sprintf("ns::%s", namespace)
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

	s.mu.Lock()
	defer s.mu.Unlock()

	// Get or create namespace data
	nsKey := getNamespaceKey(namespace)
	var ns *namespaceData

	if cachedNs, found := s.cache.Get(nsKey); found {
		ns = cachedNs.(*namespaceData)
	} else {
		ns = &namespaceData{
			Users: make(map[string]*userData),
		}
	}

	// Get or create user data
	if ns.Users[username] == nil {
		ns.Users[username] = &userData{
			Categories: make(map[string]*categoryData),
		}
	}
	user := ns.Users[username]

	// Get or create category
	if user.Categories[category] == nil {
		user.Categories[category] = &categoryData{
			Items: make(map[string]interface{}),
		}
	}

	// Set the value
	user.Categories[category].Items[key] = value

	// Store namespace data back (no expiration on namespace-level data)
	s.cache.Set(nsKey, ns, gocache.NoExpiration)

	// Also store individual entry with TTL for efficient lookup
	compositeKey := buildKey(namespace, username, category, key)
	if ttl > 0 {
		s.cache.Set(compositeKey, value, ttl)
	} else {
		s.cache.Set(compositeKey, value, gocache.NoExpiration)
	}

	return nil
}

// Get retrieves a value from namespace > username > category > key
func (s *inMemoryStore) Get(namespace, username, category, key string) (interface{}, bool) {
	// Use composite key for fast lookup
	compositeKey := buildKey(namespace, username, category, key)
	value, found := s.cache.Get(compositeKey)
	return value, found
}

// Delete removes a specific key from namespace > username > category
func (s *inMemoryStore) Delete(namespace, username, category, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Delete from composite key
	compositeKey := buildKey(namespace, username, category, key)
	s.cache.Delete(compositeKey)

	// Update namespace data structure
	nsKey := getNamespaceKey(namespace)
	if cachedNs, found := s.cache.Get(nsKey); found {
		ns := cachedNs.(*namespaceData)
		if ns.Users[username] != nil && ns.Users[username].Categories[category] != nil {
			delete(ns.Users[username].Categories[category].Items, key)

			// Cleanup empty category
			if len(ns.Users[username].Categories[category].Items) == 0 {
				delete(ns.Users[username].Categories, category)
			}

			// Cleanup empty user
			if len(ns.Users[username].Categories) == 0 {
				delete(ns.Users, username)
			}

			// Update or delete namespace data
			if len(ns.Users) == 0 {
				s.cache.Delete(nsKey)
			} else {
				s.cache.Set(nsKey, ns, gocache.NoExpiration)
			}
		}
	}

	return nil
}

// DeleteCategory removes all keys in a category for a user in a namespace
func (s *inMemoryStore) DeleteCategory(namespace, username, category string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	nsKey := getNamespaceKey(namespace)
	if cachedNs, found := s.cache.Get(nsKey); found {
		ns := cachedNs.(*namespaceData)

		if ns.Users[username] != nil {
			user := ns.Users[username]

			// Delete all composite keys for this category
			if cat := user.Categories[category]; cat != nil {
				for key := range cat.Items {
					compositeKey := buildKey(namespace, username, category, key)
					s.cache.Delete(compositeKey)
				}
			}

			// Remove category
			delete(user.Categories, category)

			// Cleanup empty user
			if len(user.Categories) == 0 {
				delete(ns.Users, username)
			}

			// Update or delete namespace data
			if len(ns.Users) == 0 {
				s.cache.Delete(nsKey)
			} else {
				s.cache.Set(nsKey, ns, gocache.NoExpiration)
			}
		}
	}

	return nil
}

// DeleteUser removes all data for a user in a specific namespace
func (s *inMemoryStore) DeleteUser(namespace, username string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	nsKey := getNamespaceKey(namespace)
	if cachedNs, found := s.cache.Get(nsKey); found {
		ns := cachedNs.(*namespaceData)

		if ns.Users[username] != nil {
			user := ns.Users[username]

			// Delete all composite keys for this user
			for category, cat := range user.Categories {
				for key := range cat.Items {
					compositeKey := buildKey(namespace, username, category, key)
					s.cache.Delete(compositeKey)
				}
			}

			// Remove user
			delete(ns.Users, username)

			// Update or delete namespace data
			if len(ns.Users) == 0 {
				s.cache.Delete(nsKey)
			} else {
				s.cache.Set(nsKey, ns, gocache.NoExpiration)
			}
		}
	}

	return nil
}

// DeleteNamespace removes all data in a namespace
func (s *inMemoryStore) DeleteNamespace(namespace string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	nsKey := getNamespaceKey(namespace)
	if cachedNs, found := s.cache.Get(nsKey); found {
		ns := cachedNs.(*namespaceData)

		// Delete all composite keys in this namespace
		for username, user := range ns.Users {
			for category, cat := range user.Categories {
				for key := range cat.Items {
					compositeKey := buildKey(namespace, username, category, key)
					s.cache.Delete(compositeKey)
				}
			}
		}

		// Delete namespace data
		s.cache.Delete(nsKey)
	}

	return nil
}

// GetCategory retrieves all key-value pairs in a category for a user in a namespace
func (s *inMemoryStore) GetCategory(namespace, username, category string) (map[string]interface{}, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	nsKey := getNamespaceKey(namespace)
	cachedNs, found := s.cache.Get(nsKey)
	if !found {
		return nil, false
	}

	ns := cachedNs.(*namespaceData)
	if ns.Users[username] == nil {
		return nil, false
	}

	user := ns.Users[username]
	cat := user.Categories[category]
	if cat == nil || len(cat.Items) == 0 {
		return nil, false
	}

	// Return a copy to prevent external modification
	// Also verify each item is still in cache (not expired)
	result := make(map[string]interface{})
	for k := range cat.Items {
		compositeKey := buildKey(namespace, username, category, k)
		if cachedValue, found := s.cache.Get(compositeKey); found {
			result[k] = cachedValue
		}
	}

	if len(result) == 0 {
		return nil, false
	}

	return result, true
}

// Clear removes all data from the store
func (s *inMemoryStore) Clear() {
	s.cache.Flush()
}

// Cleanup is handled automatically by go-cache
func (s *inMemoryStore) Cleanup() {
	// go-cache handles cleanup automatically via cleanupInterval
	// This method is provided for interface compatibility
	s.cache.DeleteExpired()
}

// Stats returns statistics about the cache
func (s *inMemoryStore) Stats() StoreStats {
	s.mu.RLock()
	defer s.mu.RUnlock()

	stats := StoreStats{}

	items := s.cache.Items()

	// Count namespaces and iterate through namespace data
	for key, item := range items {
		// Namespace keys start with "ns::"
		if len(key) > 4 && key[:4] == "ns::" {
			stats.TotalNamespaces++

			if ns, ok := item.Object.(*namespaceData); ok {
				// Count users
				stats.TotalUsers += len(ns.Users)

				// Count categories and entries
				for _, user := range ns.Users {
					stats.TotalCategories += len(user.Categories)
					for _, cat := range user.Categories {
						stats.TotalEntries += len(cat.Items)
					}
				}
			}
		}
	}

	return stats
}
