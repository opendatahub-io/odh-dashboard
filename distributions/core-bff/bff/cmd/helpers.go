package main

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"strconv"
	"strings"
)

func getEnvAsInt(name string, defaultVal int) int {
	if value, exists := os.LookupEnv(name); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultVal
}

func getEnvAsString(name string, defaultVal string) string {
	if value, exists := os.LookupEnv(name); exists {
		return value
	}
	return defaultVal
}

// firstNonEmptyEnv returns the first of names that is set to a non-blank
// value, or def. A fallback chain treats an explicitly empty variable as
// unset, so NAMESPACE="" still falls through to POD_NAMESPACE.
func firstNonEmptyEnv(def string, names ...string) string {
	for _, name := range names {
		if value, ok := os.LookupEnv(name); ok && strings.TrimSpace(value) != "" {
			return value
		}
	}
	return def
}

// parseLevel parses a LOG_LEVEL value. An invalid value falls back to INFO
// with a warning on warnOut that does not echo the value.
func parseLevel(s string, warnOut io.Writer) slog.Level {
	var level slog.Level
	if err := level.UnmarshalText([]byte(s)); err != nil {
		fmt.Fprintln(warnOut, "invalid LOG_LEVEL (value omitted; valid: error, warn, info, debug), defaulting to INFO")
		return slog.LevelInfo
	}
	return level
}
