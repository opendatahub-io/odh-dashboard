package main

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"strconv"
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

func getEnvAsBool(name string, defaultVal bool) bool {
	if value, exists := os.LookupEnv(name); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultVal
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
