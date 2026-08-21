package helper

import "sync"

// StringHolder stores a single string value that can be read and updated concurrently. It exists
// for configuration resolved asynchronously after startup — e.g. an upstream API URL discovered
// from a Kubernetes ConfigMap that may not exist yet when the process starts — so a value found
// later (by a background retry loop) takes effect immediately, without requiring a restart.
type StringHolder struct {
	mu    sync.RWMutex
	value string
}

// NewStringHolder creates a holder, optionally seeded with an initial value.
func NewStringHolder(initial string) *StringHolder {
	return &StringHolder{value: initial}
}

// Get returns the currently held value ("" if never set, including on a nil *StringHolder — a
// nil holder is treated as "not configured" rather than a programming error, since App structs
// built ad hoc in tests may not always populate every field).
func (h *StringHolder) Get() string {
	if h == nil {
		return ""
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.value
}

// Set replaces the held value. It is a no-op on a nil *StringHolder, for the same reason as Get.
func (h *StringHolder) Set(value string) {
	if h == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.value = value
}
