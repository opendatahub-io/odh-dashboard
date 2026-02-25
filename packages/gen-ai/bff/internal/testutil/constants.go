package testutil

import (
	"fmt"
	"os"
	"strconv"
)

// Shared test constants used across the gen-ai BFF test suite
const (
	TestNamespace = "test-namespace"
	TestToken     = "FAKE_BEARER_TOKEN"
)

// RequiredEnv reads an environment variable and panics if it is not set.
// Used by test infrastructure to enforce that tests run via 'make test'.
func RequiredEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required env var %s not set -- run tests via 'make test'", key))
	}
	return v
}

// GetTestLlamaStackModel returns the test model from TEST_LLAMA_STACK_MODEL.
// Panics if the env var is not set; the Makefile is the single source of truth.
func GetTestLlamaStackModel() string {
	return RequiredEnv("TEST_LLAMA_STACK_MODEL")
}

// GetTestLlamaStackPort returns the test Llama Stack port from TEST_LLAMA_STACK_PORT.
// Panics if the env var is not set or not a valid integer; the Makefile is the single source of truth.
func GetTestLlamaStackPort() int {
	v := RequiredEnv("TEST_LLAMA_STACK_PORT")
	p, err := strconv.Atoi(v)
	if err != nil {
		panic(fmt.Sprintf("TEST_LLAMA_STACK_PORT is not a valid integer: %q", v))
	}
	return p
}

// GetTestLlamaStackURL returns the test Llama Stack URL based on GetTestLlamaStackPort().
func GetTestLlamaStackURL() string {
	return fmt.Sprintf("http://localhost:%d", GetTestLlamaStackPort())
}

// ConfigureProductionEnvFromTest bridges test env vars to production env vars.
// The Makefile passes TEST_* variables; production code reads DEFAULT_* variables.
// This function connects them so the Makefile doesn't need to know production internals.
func ConfigureProductionEnvFromTest() {
	os.Setenv("DEFAULT_EMBEDDING_MODEL", RequiredEnv("TEST_LLAMA_STACK_EMBEDDING_MODEL"))
	os.Setenv("DEFAULT_EMBEDDING_DIMENSION", RequiredEnv("TEST_LLAMA_STACK_EMBEDDING_DIMENSION"))
}
