package agents

import "testing"

func TestSanitizeHTTPURL(t *testing.T) {
	assertURL := func(t *testing.T, input, want string) {
		t.Helper()
		if got := SanitizeHTTPURL(input); got != want {
			t.Fatalf("SanitizeHTTPURL(%q) = %q, want %q", input, got, want)
		}
	}

	assertURL(t, "https://example.com/path", "https://example.com/path")
	assertURL(t, "http://example.com", "http://example.com")
	assertURL(t, "http://example.com:8080/path", "http://example.com:8080/path")
	assertURL(t, "http://example.com?q=1#section", "http://example.com?q=1#section")
	assertURL(t, "javascript:alert(1)", "")
	assertURL(t, "data:text/html,<script>alert(1)</script>", "")
	assertURL(t, "file:///etc/passwd", "")
	assertURL(t, "ftp://example.com", "")
	assertURL(t, "", "")
	assertURL(t, "not-a-url", "")
	assertURL(t, "http://user:pass@example.com/path", "")
	assertURL(t, "https://user@example.com", "")
}

func TestSanitizeResourceURI(t *testing.T) {
	assertURI := func(t *testing.T, input, want string) {
		t.Helper()
		if got := SanitizeResourceURI(input); got != want {
			t.Fatalf("SanitizeResourceURI(%q) = %q, want %q", input, got, want)
		}
	}

	assertURI(t, "https://example.com/ext", "https://example.com/ext")
	assertURI(t, "urn:example:extension:state-history", "urn:example:extension:state-history")
	assertURI(t, "javascript:alert(1)", "")
	assertURI(t, "http://user@example.com", "")
}
