package lsmocks

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

const (
	fileReadyPollInterval = 500 * time.Millisecond
	fileReadyTimeout      = 60 * time.Second
)

// SeedResult holds the IDs of resources created during seeding.
type SeedResult struct {
	VectorStoreID string
	FileID        string
}

// SeedData populates the local Llama Stack server with test data:
// vector stores, files, and verifies model availability.
// Uses the typed TestLlamaStackClient which handles test ID header injection automatically.
func SeedData(baseURL string, testID string, logger *slog.Logger) (*SeedResult, error) {
	client := NewTestLlamaStackClient(baseURL, testID)
	ctx := context.Background()

	// 1. Verify models are available
	logger.Debug("Verifying models are available...")
	models, err := client.ListModels(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list models: %w", err)
	}
	if len(models) == 0 {
		return nil, fmt.Errorf("no models available from Llama Stack server")
	}
	logger.Info("Models available", slog.Int("count", len(models)))

	// 2. Create a sample vector store
	logger.Debug("Creating sample vector store...")
	vs, err := client.CreateVectorStore(ctx, llamastack.CreateVectorStoreParams{
		Name: "Test Vector Store",
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create vector store: %w", err)
	}
	logger.Info("Created vector store", slog.String("id", vs.ID))

	// 3. Upload a sample file and add it to the vector store in one call
	logger.Debug("Uploading sample file...")
	fileContent := []byte("Artificial intelligence (AI) is the simulation of human intelligence " +
		"processes by computer systems. These processes include learning, reasoning, and self-correction. " +
		"Machine learning is a subset of AI that enables systems to learn from data without explicit programming. " +
		"Deep learning is a further subset using neural networks with many layers.")
	uploadResult, err := client.UploadFile(ctx, llamastack.UploadFileParams{
		Reader:        bytes.NewReader(fileContent),
		Filename:      "test_document.txt",
		Purpose:       "assistants",
		VectorStoreID: vs.ID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to upload file: %w", err)
	}
	logger.Info("Uploaded file and added to vector store", slog.String("id", uploadResult.FileID))

	// 4. Wait for embedding to complete
	if err := waitForFileReady(ctx, client, vs.ID, uploadResult.FileID, logger); err != nil {
		return nil, fmt.Errorf("file embedding did not complete: %w", err)
	}

	result := &SeedResult{
		VectorStoreID: vs.ID,
		FileID:        uploadResult.FileID,
	}

	logger.Info("Seeded Llama Stack with test data",
		slog.String("vector_store_id", result.VectorStoreID),
		slog.String("file_id", result.FileID),
	)

	return result, nil
}

// waitForFileReady polls the vector store file status until embedding is complete.
// Llama Stack processes file embeddings asynchronously; this avoids a race where
// knowledge_search returns 0 chunks because the index isn't ready yet.
func waitForFileReady(ctx context.Context, client *TestLlamaStackClient, vectorStoreID, fileID string, logger *slog.Logger) error {
	deadline := time.Now().Add(fileReadyTimeout)

	logger.Debug("Polling vector store file status until embedding completes...",
		slog.String("vector_store_id", vectorStoreID),
		slog.String("file_id", fileID),
	)

	for time.Now().Before(deadline) {
		vsFile, err := client.GetVectorStoreFile(ctx, vectorStoreID, fileID)
		if err != nil {
			logger.Debug("File status check failed, retrying...", slog.String("error", err.Error()))
			time.Sleep(fileReadyPollInterval)
			continue
		}

		status := string(vsFile.Status)
		logger.Debug("File status", slog.String("status", status))

		switch status {
		case "completed":
			logger.Info("File embedding completed", slog.String("file_id", fileID))
			return nil
		case "failed", "cancelled":
			return fmt.Errorf("file processing ended with status %q", status)
		default:
			time.Sleep(fileReadyPollInterval)
		}
	}

	return fmt.Errorf("timed out after %v waiting for file %s to reach 'completed' status", fileReadyTimeout, fileID)
}
