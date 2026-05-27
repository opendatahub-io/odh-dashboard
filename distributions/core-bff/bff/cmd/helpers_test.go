package main

import (
	"log/slog"
	"testing"
)

func TestNewOriginParser(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected []string
	}{
		{"one item", "https://test.com", []string{"https://test.com"}},
		{"two items", "https://test.com,https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"two items spaced", "https://test.com,    https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"empty", "", []string{}},
		{"wildcard", "*", []string{"*"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			var allowList []string
			parser := newOriginParser(&allowList, "")
			if err := parser(tc.input); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(allowList) != len(tc.expected) {
				t.Fatalf("expected len=%d got=%d", len(tc.expected), len(allowList))
			}
			for i := range allowList {
				if allowList[i] != tc.expected[i] {
					t.Fatalf("expected %v got %v", tc.expected, allowList)
				}
			}
		})
	}
}

func TestGetEnvAsInt(t *testing.T) {
	t.Run("returns env value when set", func(t *testing.T) {
		t.Setenv("TEST_INT", "8080")
		if got := getEnvAsInt("TEST_INT", 4000); got != 8080 {
			t.Fatalf("expected 8080, got %d", got)
		}
	})

	t.Run("returns default when not set", func(t *testing.T) {
		if got := getEnvAsInt("TEST_INT_MISSING", 4000); got != 4000 {
			t.Fatalf("expected 4000, got %d", got)
		}
	})

	t.Run("returns default when value is not a number", func(t *testing.T) {
		t.Setenv("TEST_INT_BAD", "notanumber")
		if got := getEnvAsInt("TEST_INT_BAD", 4000); got != 4000 {
			t.Fatalf("expected 4000, got %d", got)
		}
	})
}

func TestGetEnvAsString(t *testing.T) {
	t.Run("returns env value when set", func(t *testing.T) {
		t.Setenv("TEST_STR", "hello")
		if got := getEnvAsString("TEST_STR", "default"); got != "hello" {
			t.Fatalf("expected hello, got %s", got)
		}
	})

	t.Run("returns default when not set", func(t *testing.T) {
		if got := getEnvAsString("TEST_STR_MISSING", "default"); got != "default" {
			t.Fatalf("expected default, got %s", got)
		}
	})

	t.Run("returns empty string when set to empty", func(t *testing.T) {
		t.Setenv("TEST_STR_EMPTY", "")
		if got := getEnvAsString("TEST_STR_EMPTY", "default"); got != "" {
			t.Fatalf("expected empty string, got %s", got)
		}
	})
}

func TestGetEnvAsBool(t *testing.T) {
	t.Run("returns true when set to true", func(t *testing.T) {
		t.Setenv("TEST_BOOL", "true")
		if got := getEnvAsBool("TEST_BOOL", false); got != true {
			t.Fatalf("expected true, got %v", got)
		}
	})

	t.Run("returns false when set to false", func(t *testing.T) {
		t.Setenv("TEST_BOOL", "false")
		if got := getEnvAsBool("TEST_BOOL", true); got != false {
			t.Fatalf("expected false, got %v", got)
		}
	})

	t.Run("returns default when not set", func(t *testing.T) {
		if got := getEnvAsBool("TEST_BOOL_MISSING", true); got != true {
			t.Fatalf("expected true, got %v", got)
		}
	})

	t.Run("returns default when value is invalid", func(t *testing.T) {
		t.Setenv("TEST_BOOL_BAD", "notabool")
		if got := getEnvAsBool("TEST_BOOL_BAD", true); got != true {
			t.Fatalf("expected true, got %v", got)
		}
	})
}

func TestParseLevel(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected slog.Level
	}{
		{"debug", "DEBUG", slog.LevelDebug},
		{"info", "INFO", slog.LevelInfo},
		{"warn", "WARN", slog.LevelWarn},
		{"error", "ERROR", slog.LevelError},
		{"lowercase", "debug", slog.LevelDebug},
		{"invalid defaults to info", "INVALID", slog.LevelInfo},
		{"empty defaults to info", "", slog.LevelInfo},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := parseLevel(tc.input); got != tc.expected {
				t.Fatalf("parseLevel(%q) = %v, want %v", tc.input, got, tc.expected)
			}
		})
	}
}
