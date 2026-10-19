package helper

import "sync"

type StringHolder struct {
	mu    sync.RWMutex
	value string
}

func NewStringHolder(value string) *StringHolder { return &StringHolder{value: value} }

func (h *StringHolder) Get() string {
	if h == nil {
		return ""
	}
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.value
}

func (h *StringHolder) Set(value string) {
	if h == nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	h.value = value
}
