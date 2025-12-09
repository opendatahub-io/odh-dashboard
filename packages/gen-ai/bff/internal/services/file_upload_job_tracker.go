package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"time"

	"github.com/openai/openai-go/v2"
	"github.com/opendatahub-io/gen-ai/internal/cache"
	"github.com/opendatahub-io/gen-ai/internal/constants"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack"
)

const (
	// Job storage constants
	jobNamespace = "file_uploads"
	jobCategory  = "jobs"

	// Background job timeout
	uploadTimeout = 10 * time.Minute
	// Jobs auto-expire after uploadTimeout + buffer to ensure results aren't lost
	// This prevents jobs from expiring before SetJobResult is called for long-running uploads
	jobTTL = uploadTimeout + 5*time.Minute
)

// FileUploadJobStatus represents the status of a file upload job
type FileUploadJobStatus string

const (
	JobStatusPending    FileUploadJobStatus = "pending"
	JobStatusProcessing FileUploadJobStatus = "processing"
	JobStatusCompleted  FileUploadJobStatus = "completed"
	JobStatusFailed     FileUploadJobStatus = "failed"
)

// FileUploadJob represents a file upload job
type FileUploadJob struct {
	ID        string                       `json:"id"`
	Status    FileUploadJobStatus          `json:"status"`
	Result    *llamastack.FileUploadResult `json:"result,omitempty"`
	Error     string                       `json:"error,omitempty"`
	CreatedAt time.Time                    `json:"created_at"`
	UpdatedAt time.Time                    `json:"updated_at"`
}

// FileUploadJobTracker manages file upload jobs using MemoryStore
type FileUploadJobTracker struct {
	store  cache.MemoryStore
	logger *slog.Logger
}

// NewFileUploadJobTracker creates a new file upload job tracker
func NewFileUploadJobTracker(store cache.MemoryStore, logger *slog.Logger) *FileUploadJobTracker {
	return &FileUploadJobTracker{
		store:  store,
		logger: logger,
	}
}

// CreateJob creates a new file upload job and returns its ID
func (t *FileUploadJobTracker) CreateJob(userID string) string {
	jobID := fmt.Sprintf("job_%d", time.Now().UnixNano())
	job := &FileUploadJob{
		ID:        jobID,
		Status:    JobStatusPending,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	// Store in MemoryStore with TTL
	err := t.store.Set(jobNamespace, userID, jobCategory, jobID, job, jobTTL)
	if err != nil {
		t.logger.Error("failed to create job", "job_id", jobID, "user_id", userID, "error", err)
		return ""
	}

	t.logger.Info("created file upload job", "job_id", jobID, "user_id", userID)
	return jobID
}

// GetJob retrieves a job by ID
func (t *FileUploadJobTracker) GetJob(userID, jobID string) (*FileUploadJob, error) {
	value, found := t.store.Get(jobNamespace, userID, jobCategory, jobID)
	if !found {
		return nil, errors.New("job not found")
	}

	job, ok := value.(*FileUploadJob)
	if !ok {
		t.logger.Error("invalid job type in store", "job_id", jobID, "user_id", userID)
		return nil, errors.New("invalid job data")
	}

	return job, nil
}

// updateJob updates a job in the store
func (t *FileUploadJobTracker) updateJob(userID, jobID string, updateFn func(*FileUploadJob)) error {
	job, err := t.GetJob(userID, jobID)
	if err != nil {
		return err
	}

	updateFn(job)
	job.UpdatedAt = time.Now()

	// Update in store with TTL refresh
	err = t.store.Set(jobNamespace, userID, jobCategory, jobID, job, jobTTL)
	if err != nil {
		t.logger.Error("failed to update job", "job_id", jobID, "user_id", userID, "error", err)
		return err
	}

	return nil
}

// UpdateJobStatus updates the status of a job
func (t *FileUploadJobTracker) UpdateJobStatus(userID, jobID string, status FileUploadJobStatus) error {
	err := t.updateJob(userID, jobID, func(job *FileUploadJob) {
		job.Status = status
	})
	if err != nil {
		t.logger.Error("failed to update job status", "job_id", jobID, "user_id", userID, "status", status, "error", err)
		return err
	}

	t.logger.Info("updated job status", "job_id", jobID, "user_id", userID, "status", status)
	return nil
}

// SetJobResult sets the result of a completed job
func (t *FileUploadJobTracker) SetJobResult(userID, jobID string, result *llamastack.FileUploadResult) error {
	err := t.updateJob(userID, jobID, func(job *FileUploadJob) {
		job.Result = result
		job.Status = JobStatusCompleted
	})
	if err != nil {
		t.logger.Error("failed to set job result", "job_id", jobID, "user_id", userID, "error", err)
		return err
	}

	t.logger.Info("job completed successfully", "job_id", jobID, "user_id", userID)
	return nil
}

// SetJobError sets the error of a failed job
func (t *FileUploadJobTracker) SetJobError(userID, jobID string, jobErr error) error {
	err := t.updateJob(userID, jobID, func(job *FileUploadJob) {
		job.Error = jobErr.Error()
		job.Status = JobStatusFailed
	})
	if err != nil {
		t.logger.Error("failed to set job error", "job_id", jobID, "user_id", userID, "error", err)
		return err
	}

	t.logger.Error("job failed", "job_id", jobID, "user_id", userID, "job_error", jobErr.Error())
	return nil
}

// ProcessUploadJob processes a file upload job in the background
func (t *FileUploadJobTracker) ProcessUploadJob(
	ctx context.Context,
	userID string,
	jobID string,
	uploadFunc func(context.Context, llamastack.UploadFileParams) (*llamastack.FileUploadResult, error),
	params llamastack.UploadFileParams,
	tempFilePath string,
) {
	// Extract values from original context that we need to preserve
	llamaStackClient, _ := ctx.Value(constants.LlamaStackClientKey).(llamastack.LlamaStackClientInterface)
	namespace, _ := ctx.Value(constants.NamespaceQueryParameterKey).(string)

	// Update status to processing
	if err := t.UpdateJobStatus(userID, jobID, JobStatusProcessing); err != nil {
		t.logger.Error("failed to mark job as processing", "job_id", jobID, "user_id", userID, "error", err)
		// Continue anyway - job will be marked as pending but we'll try to process it
	}

	// Process in background goroutine
	go func() {
		defer func() {
			if r := recover(); r != nil {
				t.logger.Error("panic in background upload", "job_id", jobID, "user_id", userID, "panic", r)
				if setErr := t.SetJobError(userID, jobID, fmt.Errorf("internal error: %v", r)); setErr != nil {
					t.logger.Error("failed to record panic error", "job_id", jobID, "user_id", userID, "error", setErr)
				}
			}
		}()

		// Clean up temp file when done
		if tempFilePath != "" {
			defer func() {
				if err := os.Remove(tempFilePath); err != nil {
					t.logger.Warn("failed to remove temp file", "path", tempFilePath, "error", err)
				} else {
					t.logger.Debug("removed temp file", "path", tempFilePath)
				}
			}()
		}

		// Create background context with timeout (don't cancel when request completes)
		bgCtx, cancel := context.WithTimeout(context.Background(), uploadTimeout)
		defer cancel()

		// Preserve important context values from original request
		if llamaStackClient != nil {
			bgCtx = context.WithValue(bgCtx, constants.LlamaStackClientKey, llamaStackClient)
		}
		if namespace != "" {
			bgCtx = context.WithValue(bgCtx, constants.NamespaceQueryParameterKey, namespace)
		}

		t.logger.Info("starting background upload", "job_id", jobID, "user_id", userID, "filename", params.Filename)

		// Reopen temp file for reading
		if tempFilePath != "" {
			file, err := os.Open(tempFilePath)
			if err != nil {
				t.logger.Error("failed to open temp file", "job_id", jobID, "user_id", userID, "path", tempFilePath, "error", err)
				if setErr := t.SetJobError(userID, jobID, fmt.Errorf("failed to open temp file: %w", err)); setErr != nil {
					t.logger.Error("failed to record temp file error", "job_id", jobID, "user_id", userID, "error", setErr)
				}
				return
			}
			defer file.Close()
			params.Reader = file
		}

		// Execute upload
		result, err := uploadFunc(bgCtx, params)
		if err != nil {
			t.logger.Error("upload failed", "job_id", jobID, "user_id", userID, "error", err)
			if setErr := t.SetJobError(userID, jobID, err); setErr != nil {
				t.logger.Error("failed to record upload error", "job_id", jobID, "user_id", userID, "error", setErr)
			}
			return
		}

		// Check if vector store file operation failed
		// Even if uploadFunc returns successfully, the vector store file operation may have failed
		if result != nil && result.VectorStoreFile != nil && result.VectorStoreFile.Status == openai.VectorStoreFileStatusFailed {
			// Extract error message from vector store file's last_error
			errorMsg := "vector store file operation failed"
			if result.VectorStoreFile.LastError.Message != "" {
				errorMsg = fmt.Sprintf("vector store file operation failed: %s (code: %s)",
					result.VectorStoreFile.LastError.Message,
					string(result.VectorStoreFile.LastError.Code))
			} else if result.VectorStoreFile.LastError.Code != "" {
				errorMsg = fmt.Sprintf("vector store file operation failed (code: %s)",
					string(result.VectorStoreFile.LastError.Code))
			}

			t.logger.Error("vector store operation failed", "job_id", jobID, "user_id", userID, "error", errorMsg)
			if setErr := t.SetJobError(userID, jobID, errors.New(errorMsg)); setErr != nil {
				t.logger.Error("failed to record vector store error", "job_id", jobID, "user_id", userID, "error", setErr)
			}
			return
		}

		// Success
		if err := t.SetJobResult(userID, jobID, result); err != nil {
			t.logger.Error("failed to record successful result", "job_id", jobID, "user_id", userID, "error", err)
		}
	}()
}
