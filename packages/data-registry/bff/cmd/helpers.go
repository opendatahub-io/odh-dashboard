package main

import (
	"flag"
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

func registerDevModeFlag(flagSet *flag.FlagSet, devMode *bool) {
	flagSet.BoolVar(devMode, "dev-mode", getEnvAsBool("DEV_MODE", false), "Use development mode for access to local K8s cluster")
}

func validateBFFTransportTLSConfig(devMode, allowInsecureHTTP, dchEnabled, dchTLSEnabled bool) error {
	if allowInsecureHTTP && !devMode {
		return fmt.Errorf("BFF_CLIENTS_ALLOW_INSECURE_HTTP is only permitted when DEV_MODE=true")
	}
	if dchEnabled && !dchTLSEnabled && !devMode {
		return fmt.Errorf("BFF_DCH_TLS_ENABLED=false is only permitted when DEV_MODE=true")
	}

	return nil
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
	if defaultVal != "" {
		for _, str := range strings.Split(defaultVal, ",") {
			*allowList = append(*allowList, strings.TrimSpace(str))
		}
	}

	flagInitialized := false
	return func(s string) error {
		// The default was applied when the parser was created so env values work even
		// when the flag is omitted. If the flag is supplied, replace that default,
		// including when the explicit value is empty.
		if !flagInitialized {
			*allowList = nil
			flagInitialized = true
		}

		if s == "" {
			return nil
		}

		for _, str := range strings.Split(s, ",") {
			*allowList = append(*allowList, strings.TrimSpace(str))
		}

		return nil
	}
}
