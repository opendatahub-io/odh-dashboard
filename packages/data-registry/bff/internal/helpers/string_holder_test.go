package helper

import (
	"sync"
	"testing"
)

func TestStringHolder_GetSet(t *testing.T) {
	h := NewStringHolder("")
	if got := h.Get(); got != "" {
		t.Fatalf("Get() on a fresh holder = %q, want empty", got)
	}

	h.Set("https://example.com")
	if got := h.Get(); got != "https://example.com" {
		t.Fatalf("Get() after Set() = %q, want %q", got, "https://example.com")
	}

	h.Set("https://updated.example.com")
	if got := h.Get(); got != "https://updated.example.com" {
		t.Fatalf("Get() after second Set() = %q, want %q", got, "https://updated.example.com")
	}
}

// TestStringHolder_NilReceiverIsSafe guards App structs built ad hoc (common in this package's
// tests) that may leave the holder field unset (nil): Get/Set on a nil *StringHolder must behave
// like an empty, unconfigured holder rather than panicking.
func TestStringHolder_NilReceiverIsSafe(t *testing.T) {
	var h *StringHolder

	if got := h.Get(); got != "" {
		t.Fatalf("Get() on a nil holder = %q, want empty", got)
	}

	h.Set("https://example.com") // must not panic
	if got := h.Get(); got != "" {
		t.Fatalf("Get() on a nil holder after Set() = %q, want empty (Set is a no-op)", got)
	}
}

func TestStringHolder_SeededInitialValue(t *testing.T) {
	h := NewStringHolder("https://seeded.example.com")
	if got := h.Get(); got != "https://seeded.example.com" {
		t.Fatalf("Get() on seeded holder = %q, want %q", got, "https://seeded.example.com")
	}
}

// TestStringHolder_ConcurrentAccess exercises Get/Set from many goroutines under -race to guard
// against the exact scenario this type exists for: a background discovery loop calling Set while
// request-handling goroutines concurrently call Get.
func TestStringHolder_ConcurrentAccess(t *testing.T) {
	h := NewStringHolder("initial")
	var wg sync.WaitGroup

	for i := 0; i < 50; i++ {
		wg.Add(2)
		go func() {
			defer wg.Done()
			h.Set("updated")
		}()
		go func() {
			defer wg.Done()
			_ = h.Get()
		}()
	}

	wg.Wait()
}
