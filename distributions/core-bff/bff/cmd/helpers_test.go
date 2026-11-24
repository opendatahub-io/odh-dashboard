package main

import (
	"io"
	"log/slog"
	"testing"
)

func TestNewListParser(t *testing.T) {
	cases := []struct {
		name     string
		input    string
		expected []string
	}{
		{"one item", "https://test.com", []string{"https://test.com"}},
		{"two items", "https://test.com,https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"two items spaced", "https://test.com,    https://test2.com", []string{"https://test.com", "https://test2.com"}},
		{"empty", "", []string{}},
		{"only separators", ",, ,", []string{}},
		{"wildcard", "*", []string{"*"}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			allowList := []string{"stale-seeded-default"}
			parser := newListParser(&allowList)
			if err := parser(tc.input); err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if len(allowList) != len(tc.expected) {
				t.Fatalf("expected len=%d got=%d (%v)", len(tc.expected), len(allowList), allowList)
			}
			for i := range allowList {
				if allowList[i] != tc.expected[i] {
					t.Fatalf("expected %v got %v", tc.expected, allowList)
				}
			}
		})
	}
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
			if got := parseLevel(tc.input, io.Discard); got != tc.expected {
				t.Fatalf("parseLevel(%q) = %v, want %v", tc.input, got, tc.expected)
			}
		})
	}
}
