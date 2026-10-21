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
	err := level.UnmarshalText([]byte(s))
	if err != nil {
		panic(fmt.Errorf("invalid log level: %s, valid levels are: error, warn, info, debug", s))
	}
	return level
}

func newOriginParser(allowList *[]string, defaultVal string) func(s string) error {
	parse := func(s string) []string {
		var values []string
		for _, str := range strings.Split(s, ",") {
			if value := strings.TrimSpace(str); value != "" {
				values = append(values, value)
			}
		}
		return values
	}

	// flag.Func only calls its parser for explicitly supplied flags, so initialize
	// the environment default now. An explicit flag replaces it, including "".
	*allowList = parse(defaultVal)
	return func(s string) error {
		*allowList = parse(s)
		return nil
	}
}
