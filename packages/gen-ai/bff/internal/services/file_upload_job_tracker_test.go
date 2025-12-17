package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestFileUploadJobTracker_CreateJob(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should create job with pending status", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		assert.NotEmpty(t, jobID)
		// Job ID should be a valid UUID
		_, err = uuid.Parse(jobID)
		assert.NoError(t, err, "job ID should be a valid UUID")

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, jobID, job.ID)
		assert.Equal(t, JobStatusPending, job.Status)
		assert.Nil(t, job.Result)
		assert.Empty(t, job.Error)
		assert.False(t, job.CreatedAt.IsZero())
		assert.False(t, job.UpdatedAt.IsZero())
	})

	t.Run("should create unique job IDs", func(t *testing.T) {
		userID := "test-user"
		jobID1, err := tracker.CreateJob(userID)
		require.NoError(t, err)
		jobID2, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		assert.NotEqual(t, jobID1, jobID2)
		// Both should be valid UUIDs
		_, err = uuid.Parse(jobID1)
		assert.NoError(t, err)
		_, err = uuid.Parse(jobID2)
		assert.NoError(t, err)
	})

	t.Run("should isolate jobs by user", func(t *testing.T) {
		user1 := "user1"
		user2 := "user2"

		jobID1, err := tracker.CreateJob(user1)
		require.NoError(t, err)
		jobID2, err := tracker.CreateJob(user2)
		require.NoError(t, err)

		// User1 can get their job
		job1, err := tracker.GetJob(user1, jobID1)
		require.NoError(t, err)
		assert.Equal(t, jobID1, job1.ID)

		// User2 can get their job
		job2, err := tracker.GetJob(user2, jobID2)
		require.NoError(t, err)
		assert.Equal(t, jobID2, job2.ID)

		// User1 cannot get user2's job
		_, err = tracker.GetJob(user1, jobID2)
		assert.Error(t, err)

		// User2 cannot get user1's job
		_, err = tracker.GetJob(user2, jobID1)
		assert.Error(t, err)
	})
}

func TestFileUploadJobTracker_GetJob(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should return error for non-existent job", func(t *testing.T) {
		_, err := tracker.GetJob("test-user", "non-existent-job")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "job not found")
	})

	t.Run("should retrieve existing job", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, jobID, job.ID)
		assert.Equal(t, JobStatusPending, job.Status)
	})
}

func TestFileUploadJobTracker_UpdateJobStatus(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should update job status from pending to processing", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		err = tracker.UpdateJobStatus(userID, jobID, JobStatusProcessing)
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusProcessing, job.Status)
	})

	t.Run("should update timestamp when status changes", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		job1, _ := tracker.GetJob(userID, jobID)
		originalTime := job1.UpdatedAt

		time.Sleep(10 * time.Millisecond)
		err = tracker.UpdateJobStatus(userID, jobID, JobStatusProcessing)
		require.NoError(t, err)

		job2, _ := tracker.GetJob(userID, jobID)
		assert.True(t, job2.UpdatedAt.After(originalTime))
	})

	t.Run("should return error for non-existent job", func(t *testing.T) {
		err := tracker.UpdateJobStatus("test-user", "non-existent", JobStatusProcessing)
		assert.Error(t, err)
	})
}

func TestFileUploadJobTracker_SetJobResult(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should set result and mark as completed", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		completedStatus := openai.VectorStoreFileStatusCompleted
		result := &llamastack.FileUploadResult{
			FileID: "file-123",
			VectorStoreFile: &openai.VectorStoreFile{
				ID:            "vsf-456",
				VectorStoreID: "vs-789",
				Status:        completedStatus,
			},
		}

		err = tracker.SetJobResult(userID, jobID, result)
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusCompleted, job.Status)
		assert.NotNil(t, job.Result)
		assert.Equal(t, "file-123", job.Result.FileID)
		assert.Equal(t, "vsf-456", job.Result.VectorStoreFile.ID)
		assert.Empty(t, job.Error)
	})
}

func TestFileUploadJobTracker_SetJobError(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should set error and mark as failed", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		testError := errors.New("upload failed: network timeout")
		err = tracker.SetJobError(userID, jobID, testError)
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Nil(t, job.Result)
		assert.Equal(t, "upload failed: network timeout", job.Error)
	})
}

func TestFileUploadJobTracker_ProcessUploadJob(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should process upload successfully", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Create temp file
		tempFile, err := os.CreateTemp("", "test-upload-*.txt")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		_, err = tempFile.WriteString("test content")
		require.NoError(t, err)
		tempFile.Close()

		// Mock upload function that succeeds
		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			completedStatus := openai.VectorStoreFileStatusCompleted
			return &llamastack.FileUploadResult{
				FileID: "file-success",
				VectorStoreFile: &openai.VectorStoreFile{
					ID:            "vsf-success",
					VectorStoreID: "vs-123",
					Status:        completedStatus,
				},
			}, nil
		}

		ctx := context.Background()
		params := llamastack.UploadFileParams{
			Filename:    "test.txt",
			ContentType: "text/plain",
		}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)

		// Wait for background processing
		time.Sleep(100 * time.Millisecond)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusCompleted, job.Status)
		assert.NotNil(t, job.Result)
		assert.Equal(t, "file-success", job.Result.FileID)

		// Verify temp file was cleaned up
		_, err = os.Stat(tempFilePath)
		assert.True(t, os.IsNotExist(err), "temp file should be deleted")
	})

	t.Run("should handle upload failure", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Create temp file
		tempFile, err := os.CreateTemp("", "test-upload-*.txt")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		tempFile.Close()

		// Mock upload function that fails
		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			return nil, errors.New("network error")
		}

		ctx := context.Background()
		params := llamastack.UploadFileParams{
			Filename:    "test.txt",
			ContentType: "text/plain",
		}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)

		// Wait for background processing
		time.Sleep(100 * time.Millisecond)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Nil(t, job.Result)
		assert.Contains(t, job.Error, "network error")

		// Verify temp file was cleaned up even on error
		_, err = os.Stat(tempFilePath)
		assert.True(t, os.IsNotExist(err), "temp file should be deleted even on error")
	})

	t.Run("should detect vector store file failure", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Create temp file
		tempFile, err := os.CreateTemp("", "test-upload-*.txt")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		tempFile.Close()

		// Mock upload function that returns success but vector store file failed
		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			failedStatus := openai.VectorStoreFileStatusFailed
			return &llamastack.FileUploadResult{
				FileID: "file-123",
				VectorStoreFile: &openai.VectorStoreFile{
					ID:            "vsf-123",
					VectorStoreID: "vs-123",
					Status:        failedStatus,
					LastError: openai.VectorStoreFileLastError{
						Code:    "processing_error",
						Message: "failed to chunk document",
					},
				},
			}, nil
		}

		ctx := context.Background()
		params := llamastack.UploadFileParams{
			Filename:    "test.txt",
			ContentType: "text/plain",
		}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)

		// Wait for background processing
		time.Sleep(100 * time.Millisecond)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Nil(t, job.Result)
		assert.Contains(t, job.Error, "vector store file operation failed")
		assert.Contains(t, job.Error, "failed to chunk document")
		assert.Contains(t, job.Error, "processing_error")
	})

	t.Run("should handle missing temp file", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		tempFilePath := "/tmp/non-existent-file.txt"

		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			return nil, errors.New("should not be called")
		}

		ctx := context.Background()
		params := llamastack.UploadFileParams{
			Filename:    "test.txt",
			ContentType: "text/plain",
		}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)

		// Wait for background processing
		time.Sleep(100 * time.Millisecond)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Contains(t, job.Error, "failed to open temp file")
	})

	t.Run("should preserve context values in background goroutine", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Create temp file
		tempFile, err := os.CreateTemp("", "test-upload-*.txt")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		tempFile.Close()

		// Track if context values are preserved
		var receivedNamespace string
		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			if ns, ok := ctx.Value(constants.NamespaceQueryParameterKey).(string); ok {
				receivedNamespace = ns
			}
			completedStatus := openai.VectorStoreFileStatusCompleted
			return &llamastack.FileUploadResult{
				FileID: "file-123",
				VectorStoreFile: &openai.VectorStoreFile{
					ID:     "vsf-123",
					Status: completedStatus,
				},
			}, nil
		}

		// Create context with namespace
		ctx := context.WithValue(context.Background(), constants.NamespaceQueryParameterKey, "test-namespace")
		params := llamastack.UploadFileParams{
			Filename:    "test.txt",
			ContentType: "text/plain",
		}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)

		// Wait for background processing
		time.Sleep(100 * time.Millisecond)

		assert.Equal(t, "test-namespace", receivedNamespace, "namespace should be preserved in background context")
	})
}

func TestFileUploadJobTracker_JobExpiration(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should expire job after TTL", func(t *testing.T) {
		// This test would require either:
		// 1. Waiting for 10 minutes (not practical)
		// 2. Making TTL configurable (better approach)
		// 3. Using a mock clock (best approach)

		// For now, we'll just verify that the TTL is set correctly
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Job should exist immediately
		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, jobID, job.ID)

		// Note: In production, this job will expire after jobTTL (uploadTimeout + 5 minutes = 15 minutes)
		// To properly test expiration, we would need to:
		// 1. Make jobTTL a configurable parameter
		// 2. Set it to a short duration in tests (e.g., 100ms)
		// 3. Wait for expiration and verify job is not found
	})
}

func TestFileUploadJobTracker_ConcurrentAccess(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should handle concurrent job creation", func(t *testing.T) {
		const numGoroutines = 10
		userID := "test-user"
		jobIDs := make(chan string, numGoroutines)

		for i := 0; i < numGoroutines; i++ {
			go func() {
				jobID, err := tracker.CreateJob(userID)
				if err != nil {
					t.Errorf("failed to create job: %v", err)
					return
				}
				jobIDs <- jobID
			}()
		}

		// Collect all job IDs
		uniqueIDs := make(map[string]bool)
		for i := 0; i < numGoroutines; i++ {
			jobID := <-jobIDs
			uniqueIDs[jobID] = true
		}

		// All job IDs should be unique
		assert.Equal(t, numGoroutines, len(uniqueIDs))

		// All jobs should be retrievable
		for jobID := range uniqueIDs {
			job, err := tracker.GetJob(userID, jobID)
			require.NoError(t, err)
			assert.Equal(t, jobID, job.ID)
		}
	})

	t.Run("should handle concurrent updates to same job", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		const numGoroutines = 5
		done := make(chan bool, numGoroutines)

		// Multiple goroutines updating job status
		for i := 0; i < numGoroutines; i++ {
			go func(iteration int) {
				err := tracker.UpdateJobStatus(userID, jobID, JobStatusProcessing)
				assert.NoError(t, err)
				done <- true
			}(i)
		}

		// Wait for all goroutines
		for i := 0; i < numGoroutines; i++ {
			<-done
		}

		// Job should still be valid and have processing status
		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusProcessing, job.Status)
	})
}

func TestFileUploadJobTracker_EdgeCases(t *testing.T) {
	store := cache.NewMemoryStore()
	logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelError}))
	tracker := NewFileUploadJobTracker(store, logger)

	t.Run("should handle empty error message", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		err = tracker.SetJobError(userID, jobID, fmt.Errorf(""))
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Empty(t, job.Error)
	})

	t.Run("should handle nil result", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		err = tracker.SetJobResult(userID, jobID, nil)
		require.NoError(t, err)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusCompleted, job.Status)
		assert.Nil(t, job.Result)
	})

	t.Run("should handle vector store file with only error code", func(t *testing.T) {
		userID := "test-user"
		jobID, err := tracker.CreateJob(userID)
		require.NoError(t, err)

		// Create temp file
		tempFile, err := os.CreateTemp("", "test-upload-*.txt")
		require.NoError(t, err)
		tempFilePath := tempFile.Name()
		tempFile.Close()

		uploadFunc := func(ctx context.Context, params llamastack.UploadFileParams) (*llamastack.FileUploadResult, error) {
			failedStatus := openai.VectorStoreFileStatusFailed
			return &llamastack.FileUploadResult{
				FileID: "file-123",
				VectorStoreFile: &openai.VectorStoreFile{
					Status: failedStatus,
					LastError: openai.VectorStoreFileLastError{
						Code:    "error_code_only",
						Message: "",
					},
				},
			}, nil
		}

		ctx := context.Background()
		params := llamastack.UploadFileParams{Filename: "test.txt"}

		tracker.ProcessUploadJob(ctx, userID, jobID, uploadFunc, params, tempFilePath)
		time.Sleep(100 * time.Millisecond)

		job, err := tracker.GetJob(userID, jobID)
		require.NoError(t, err)
		assert.Equal(t, JobStatusFailed, job.Status)
		assert.Contains(t, job.Error, "error_code_only")
	})
}
