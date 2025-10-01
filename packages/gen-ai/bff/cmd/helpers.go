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

// TODO: remove nolint comment below when we use this method
//
//nolint:unused
func getEnvAsBool(name string, defaultVal bool) bool {
	if value, exists := os.LookupEnv(name); exists {
		boolValue, err := strconv.ParseBool(value)
		if err == nil {
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

func newKeywordParser(keywordList *[]string, defaultVal string) func(s string) error {
	return func(s string) error {
		value := defaultVal

		if s != "" {
			value = s
		}

		if value == "" {
			return nil
		}

		for _, str := range strings.Split(s, ",") {
			*keywordList = append(*keywordList, strings.TrimSpace(str))
		}

		return nil
	}
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

		for _, str := range strings.Split(s, ",") {
			*allowList = append(*allowList, strings.TrimSpace(str))
		}

		return nil
	}
}
