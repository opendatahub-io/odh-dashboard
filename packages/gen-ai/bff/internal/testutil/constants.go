package testutil

import (
	"fmt"
	"os"
	"strconv"
)

// Shared test constants used across the gen-ai BFF test suite
const (
	TestNamespace         = "test-namespace"
	TestToken             = "FAKE_BEARER_TOKEN"
	DefaultLlamaStackPort = 8321

	defaultGeminiModel          = "gemini/models/gemini-2.5-flash"
	defaultGeminiEmbeddingModel = "gemini/models/gemini-embedding-001"
)

// GetTestLlamaStackModel returns the test model from TEST_LLAMA_STACK_MODEL (or default).
func GetTestLlamaStackModel() string {
	if v := os.Getenv("TEST_LLAMA_STACK_MODEL"); v != "" {
		return v
	}
	return defaultGeminiModel
}

// GetTestLlamaStackEmbeddingModel returns the test embedding model from TEST_LLAMA_STACK_EMBEDDING_MODEL (or default).
func GetTestLlamaStackEmbeddingModel() string {
	if v := os.Getenv("TEST_LLAMA_STACK_EMBEDDING_MODEL"); v != "" {
		return v
	}
	return defaultGeminiEmbeddingModel
}

// GetTestLlamaStackPort returns the test Llama Stack port from TEST_LLAMA_STACK_PORT (or default).
func GetTestLlamaStackPort() int {
	if v := os.Getenv("TEST_LLAMA_STACK_PORT"); v != "" {
		if p, err := strconv.Atoi(v); err == nil {
			return p
		}
	}
	return DefaultLlamaStackPort
}

// GetTestLlamaStackURL returns the test Llama Stack URL based on GetTestLlamaStackPort().
func GetTestLlamaStackURL() string {
	return fmt.Sprintf("http://localhost:%d", GetTestLlamaStackPort())
}
