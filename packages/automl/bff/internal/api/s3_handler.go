package api

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// GetS3FileHandler retrieves a file from S3 storage using credentials from a Kubernetes secret.
// Query parameters:
//   - namespace (required): The Kubernetes namespace containing the secret
//   - secretName (optional): Name of the Kubernetes secret holding S3 credentials.
//     If omitted, the secret name is taken from the DSPA associated with the
//     Pipeline Server in this namespace (set by attachPipelineClientIfNeeded middleware).
//   - bucket (optional): The S3 bucket name; if not provided, will use AWS_S3_BUCKET from the secret
//   - key (required): The S3 object key to retrieve
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get namespace from context (set by AttachNamespace middleware)
	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	// Parse query parameters
	queryParams := r.URL.Query()

	secretName := strings.TrimSpace(queryParams.Get("secretName"))

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required and cannot be empty"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Resolve S3 credentials from one of two sources:
	//   1. DSPA object storage config injected by attachPipelineClientIfNeeded (primary in production).
	//      Uses the credential field names and endpoint coordinates from the DSPA spec, so it
	//      works for both external S3 and managed MinIO without requiring the caller to know
	//      which secret is in use.
	//   2. Explicit secretName query parameter (override / development path).
	//      Falls back to conventional AWS_* field names for the secret's credential keys.
	//
	// TODO: the K8s credential error handling block below is duplicated in GetS3FileSchemaHandler.
	// Extract into a shared helper once a third handler needs it.
	var creds *repositories.S3Credentials
	var credsErr error
	var dspaStorage *models.DSPAObjectStorage
	if secretName != "" {
		// Explicit override: use conventional AWS_* field names
		creds, credsErr = app.repositories.S3.GetS3Credentials(ctx, client, namespace, secretName, identity)
	} else if storage, ok := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage); ok && storage != nil {
		// Primary production path: use field names and endpoint from DSPA spec
		dspaStorage = storage
		secretName = dspaStorage.SecretName
		creds, credsErr = app.repositories.S3.GetS3CredentialsFromDSPA(ctx, client, namespace, dspaStorage, identity)
	} else {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required when no DSPA object storage config is available"))
		return
	}
	err = credsErr
	if err != nil {
		// Check if it's a Kubernetes API error and handle accordingly
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				httpError := &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("namespace '%s' or secret '%s' not found", namespace, secretName),
					},
				}
				app.errorResponse(w, r, httpError)
				return
			}
			if apierrors.IsForbidden(statusErr) {
				app.forbiddenResponse(w, r, err.Error())
				return
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, err.Error())
				return
			}
		}

		// Check if it's a secret not found or validation error
		if strings.Contains(err.Error(), "not found") {
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: err.Error(),
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}

		if strings.Contains(err.Error(), "missing required field") {
			app.badRequestResponse(w, r, err)
			return
		}

		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving S3 credentials: %s", err.Error()))
		return
	}

	// Determine bucket.
	// On the DSPA path, always use the DSPA-configured bucket and ignore any
	// caller-supplied value. This eliminates both bucket substitution (the DSPA
	// bucket wins by design) and oracle enumeration (no differential 400 response
	// reveals whether a particular bucket name is configured).
	// On the explicit secretName path, use the query param or fall back to the
	// AWS_S3_BUCKET field in the secret.
	bucket := queryParams.Get("bucket")
	if dspaStorage != nil {
		if dspaStorage.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("DSPA object storage configuration does not specify a bucket; contact your administrator"))
			return
		}
		bucket = dspaStorage.Bucket
	} else if bucket == "" {
		if creds.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
			return
		}
		bucket = creds.Bucket
	}

	// Retrieve the file from S3
	objectReader, contentType, err := app.repositories.S3.GetS3Object(ctx, creds, bucket, key)
	if err != nil {
		// Check if it's an S3 error (e.g., object not found, access denied)
		var noSuchKey *types.NoSuchKey
		var notFound *types.NotFound
		if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("object '%s' not found in bucket '%s'", key, bucket),
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}

		// Check for access denied errors
		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", bucket, key))
			return
		}

		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving file from S3: %s", err.Error()))
		return
	}

	// Ensure cleanup of the reader
	if closer, ok := objectReader.(io.Closer); ok {
		defer closer.Close()
	}

	w.Header().Set("Content-Type", contentType)

	// Stream the file content to the response
	w.WriteHeader(http.StatusOK)
	_, err = io.Copy(w, objectReader)
	if err != nil {
		// Log the error but can't send error response as headers are already written
		app.logger.Error("error streaming S3 object to response",
			"error", err,
			"bucket", bucket,
			"key", key,
		)
	}
}

// GetS3FileSchemaHandler retrieves the schema (column names) from a CSV file in S3 storage.
// Query parameters:
//   - namespace (required): The Kubernetes namespace containing the secret
//   - secretName (optional): Name of the Kubernetes secret holding S3 credentials.
//     If omitted, the secret name is taken from the DSPA associated with the
//     Pipeline Server in this namespace (set by attachPipelineClientIfNeeded middleware).
//   - bucket (optional): The S3 bucket name; if not provided, will use AWS_S3_BUCKET from the secret
//   - key (required): The S3 object key to retrieve
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) GetS3FileSchemaHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get namespace from context (set by AttachNamespace middleware)
	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	// Parse query parameters
	queryParams := r.URL.Query()

	secretName := strings.TrimSpace(queryParams.Get("secretName"))

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required and cannot be empty"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Resolve S3 credentials using the same dual-source approach as GetS3FileHandler.
	var creds *repositories.S3Credentials
	var credsErr error
	var dspaStorage *models.DSPAObjectStorage
	if secretName != "" {
		creds, credsErr = app.repositories.S3.GetS3Credentials(ctx, client, namespace, secretName, identity)
	} else if storage, ok := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage); ok && storage != nil {
		dspaStorage = storage
		secretName = dspaStorage.SecretName
		creds, credsErr = app.repositories.S3.GetS3CredentialsFromDSPA(ctx, client, namespace, dspaStorage, identity)
	} else {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required when no DSPA object storage config is available"))
		return
	}
	err = credsErr
	if err != nil {
		// Check if it's a Kubernetes API error and handle accordingly
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				httpError := &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("namespace '%s' or secret '%s' not found", namespace, secretName),
					},
				}
				app.errorResponse(w, r, httpError)
				return
			}
			if apierrors.IsForbidden(statusErr) {
				app.forbiddenResponse(w, r, err.Error())
				return
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, err.Error())
				return
			}
		}

		// Check if it's a secret not found or validation error
		if strings.Contains(err.Error(), "not found") {
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: err.Error(),
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}

		if strings.Contains(err.Error(), "missing required field") {
			app.badRequestResponse(w, r, err)
			return
		}

		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving S3 credentials: %s", err.Error()))
		return
	}

	// Apply the same oracle-free bucket logic as GetS3FileHandler.
	bucket := queryParams.Get("bucket")
	if dspaStorage != nil {
		if dspaStorage.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("DSPA object storage configuration does not specify a bucket; contact your administrator"))
			return
		}
		bucket = dspaStorage.Bucket
	} else if bucket == "" {
		if creds.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
			return
		}
		bucket = creds.Bucket
	}

	// Retrieve the CSV schema from S3
	schemaResult, err := app.repositories.S3.GetS3CSVSchema(ctx, creds, bucket, key)
	if err != nil {
		// Check if it's an S3 error (e.g., object not found, access denied)
		var noSuchKey *types.NoSuchKey
		var notFound *types.NotFound
		if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
			httpError := &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("object '%s' not found in bucket '%s'", key, bucket),
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}

		// Check for access denied errors
		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", bucket, key))
			return
		}

		// Check for CSV validation errors (content/format issues)
		// These are specific error messages from CSV parsing that indicate bad file content
		errMsg := err.Error()
		if strings.Contains(errMsg, "CSV file must contain at least one complete line") ||
			strings.Contains(errMsg, "CSV file is empty") ||
			strings.Contains(errMsg, "CSV file has no columns") ||
			strings.Contains(errMsg, "does not appear to be a valid text/CSV file") ||
			strings.Contains(errMsg, "must contain at least 100 data rows") ||
			strings.Contains(errMsg, "100 or more lines are supported") ||
			strings.Contains(errMsg, "only CSV files are supported") ||
			strings.Contains(errMsg, "endpoint validation failed") {
			app.badRequestResponse(w, r, err)
			return
		}

		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving CSV schema from S3: %s", err.Error()))
		return
	}

	// Return the columns and parse warnings in the standard response format
	response := map[string]interface{}{
		"data": map[string]interface{}{
			"columns":        schemaResult.Columns,
			"parse_warnings": schemaResult.ParseWarnings,
		},
	}

	err = app.WriteJSON(w, http.StatusOK, response, nil)
	if err != nil {
		app.logger.Error("error writing JSON response", "error", err)
	}
}
