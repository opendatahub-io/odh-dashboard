package main

import (
	"fmt"
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

func getEnvAsBool(name string, defaultVal bool) bool {
	if value, exists := os.LookupEnv(name); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultVal
}

func parseLevel(s string) slog.Level {
	var level slog.Level
	if err := level.UnmarshalText([]byte(s)); err != nil {
		fmt.Fprintf(os.Stderr, "invalid log level %q (valid: error, warn, info, debug), defaulting to INFO\n", s)
		return slog.LevelInfo
	}
	return level
}

func newOriginParser(allowList *[]string, defaultVal string) func(s string) error {
	return func(s string) error {
		value := defaultVal
		if s != "" {
			value = s
		}
		if value == "" {
			return nil
		}

		for _, str := range strings.Split(value, ",") {
			if trimmed := strings.TrimSpace(str); trimmed != "" {
				*allowList = append(*allowList, trimmed)
			}
		}

		return nil
	}
}
