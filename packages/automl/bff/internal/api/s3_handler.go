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
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// resolvedS3 holds a ready-to-use S3 client and the resolved bucket name.
type resolvedS3 struct {
	client s3int.S3ClientInterface
	bucket string
}

// resolveS3Client resolves S3 credentials (from DSPA context or an explicit secretName),
// creates an S3 client via the factory, and resolves the bucket.
// Returns false if an error response was already written to w.
func (app *App) resolveS3Client(w http.ResponseWriter, r *http.Request, secretName, bucketOverride string) (*resolvedS3, bool) {
	ctx := r.Context()

	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return nil, false
	}

	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return nil, false
	}

	k8sClient, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return nil, false
	}

	var creds *s3int.S3Credentials
	var dspaStorage *models.DSPAObjectStorage

	if secretName != "" {
		creds, err = app.repositories.S3.GetS3Credentials(ctx, k8sClient, namespace, secretName, identity)
	} else if storage, ok := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage); ok && storage != nil {
		dspaStorage = storage
		secretName = dspaStorage.SecretName
		creds, err = app.repositories.S3.GetS3CredentialsFromDSPA(ctx, k8sClient, namespace, dspaStorage, identity)
	} else {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required when no DSPA object storage config is available"))
		return nil, false
	}

	if err != nil {
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				app.errorResponse(w, r, &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("namespace '%s' or secret '%s' not found", namespace, secretName),
					},
				})
				return nil, false
			}
			if apierrors.IsForbidden(statusErr) {
				app.forbiddenResponse(w, r, err.Error())
				return nil, false
			}
			if apierrors.IsUnauthorized(statusErr) {
				app.unauthorizedResponse(w, r, err.Error())
				return nil, false
			}
		}
		if strings.Contains(err.Error(), "not found") {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: err.Error(),
				},
			})
			return nil, false
		}
		if strings.Contains(err.Error(), "missing required field") {
			app.badRequestResponse(w, r, err)
			return nil, false
		}
		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving S3 credentials: %s", err.Error()))
		return nil, false
	}

	// Resolve bucket.
	// On the DSPA path the configured bucket always wins; any caller-supplied override
	// is ignored to prevent bucket substitution and oracle-enumeration attacks.
	// On the explicit secretName path use the override or fall back to AWS_S3_BUCKET.
	var bucket string
	if dspaStorage != nil {
		if dspaStorage.Bucket == "" {
			app.serviceUnavailableResponseWithMessage(w, r,
				fmt.Errorf("DSPA object storage configuration does not specify a bucket"),
				"DSPA object storage is missing a bucket — contact your administrator")
			return nil, false
		}
		bucket = dspaStorage.Bucket
	} else {
		bucket = strings.TrimSpace(bucketOverride)
		if bucket == "" {
			bucket = strings.TrimSpace(creds.Bucket)
			if bucket == "" {
				app.badRequestResponse(w, r, fmt.Errorf("bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
				return nil, false
			}
		}
	}

	s3Client, err := app.s3ClientFactory.CreateClient(creds)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create S3 client: %w", err))
		return nil, false
	}

	return &resolvedS3{client: s3Client, bucket: bucket}, true
}

// GetS3FileHandler retrieves a file from S3 storage.
// Query parameters:
//   - secretName (optional): Kubernetes secret with S3 credentials.
//     If omitted, credentials are taken from the DSPA associated with the namespace.
//   - bucket (optional): S3 bucket; ignored on the DSPA path.
//   - key (required): S3 object key to retrieve.
func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	queryParams := r.URL.Query()

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required and cannot be empty"))
		return
	}

	s3, ok := app.resolveS3Client(w, r, strings.TrimSpace(queryParams.Get("secretName")), queryParams.Get("bucket"))
	if !ok {
		return
	}

	ctx := r.Context()
	objectReader, contentType, err := s3.client.GetObject(ctx, s3.bucket, key)
	if err != nil {
		var noSuchKey *types.NoSuchKey
		var notFound *types.NotFound
		if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("object '%s' not found in bucket '%s'", key, s3.bucket),
				},
			})
			return
		}

		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", s3.bucket, key))
			return
		}

		app.serverErrorResponseWithMessage(w, r, err, fmt.Sprintf("error retrieving file from S3: %s", err.Error()))
		return
	}

	defer objectReader.Close()

	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	_, err = io.Copy(w, objectReader)
	if err != nil {
		app.logger.Error("error streaming S3 object to response",
			"error", err, "bucket", s3.bucket, "key", key)
	}
}

// GetS3FileSchemaHandler retrieves the schema (column names and types) from a CSV file in S3.
// Query parameters:
//   - secretName (optional): Kubernetes secret with S3 credentials.
//     If omitted, credentials are taken from the DSPA associated with the namespace.
//   - bucket (optional): S3 bucket; ignored on the DSPA path.
//   - key (required): S3 object key (must be a .csv file).
func (app *App) GetS3FileSchemaHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	queryParams := r.URL.Query()

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required and cannot be empty"))
		return
	}

	s3, ok := app.resolveS3Client(w, r, strings.TrimSpace(queryParams.Get("secretName")), queryParams.Get("bucket"))
	if !ok {
		return
	}

	ctx := r.Context()
	schemaResult, err := s3.client.GetCSVSchema(ctx, s3.bucket, key)
	if err != nil {
		var noSuchKey *types.NoSuchKey
		var notFound *types.NotFound
		if errors.As(err, &noSuchKey) || errors.As(err, &notFound) {
			app.errorResponse(w, r, &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("object '%s' not found in bucket '%s'", key, s3.bucket),
				},
			})
			return
		}

		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", s3.bucket, key))
			return
		}

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

	response := map[string]interface{}{
		"data": map[string]interface{}{
			"columns":        schemaResult.Columns,
			"parse_warnings": schemaResult.ParseWarnings,
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.logger.Error("error writing JSON response", "error", err)
	}
}

// S3FilesEnvelope is the response envelope for GET /s3/files.
type S3FilesEnvelope Envelope[models.S3ListObjectsResponse, None]

// GetS3FilesHandler lists objects in an S3 bucket.
// Query parameters:
//   - secretName (optional): Kubernetes secret with S3 credentials.
//     If omitted, credentials are taken from the DSPA associated with the namespace.
//   - bucket (optional): S3 bucket; ignored on the DSPA path.
//   - path (optional): Virtual prefix / folder to list within (non-empty if provided).
//   - search (optional): Substring filter; must not contain '/'.
//   - next (optional): Continuation token for pagination (non-empty if provided).
//   - limit (optional): Page size 1–1000 (default 1000).
func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	queryParams := r.URL.Query()

	params, err := validateGetS3FilesParams(queryParams)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	s3, ok := app.resolveS3Client(w, r, params.secretName, params.bucket)
	if !ok {
		return
	}

	ctx := r.Context()
	result, err := s3.client.ListObjects(ctx, s3.bucket, s3int.ListObjectsOptions{
		Path:   params.path,
		Search: params.search,
		Next:   params.next,
		Limit:  params.limit,
	})
	if err != nil {
		var noBucket *types.NoSuchBucket
		if errors.As(err, &noBucket) {
			app.notFoundResponseWithMessage(w, r, fmt.Sprintf("bucket '%s' does not exist", s3.bucket))
			return
		}

		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 bucket '%s'", s3.bucket))
			return
		}

		app.serverErrorResponse(w, r, err)
		return
	}

	if result == nil {
		app.serverErrorResponse(w, r, fmt.Errorf("unexpected nil response from S3 ListObjects"))
		return
	}

	envelope := S3FilesEnvelope{
		Data:     *result,
		Metadata: &struct{}{},
	}
	if err := app.WriteJSON(w, http.StatusOK, envelope, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

const maxS3ListLimit int32 = 1000

type s3FilesParams struct {
	secretName string
	bucket     string
	path       string
	search     string
	next       string
	limit      int32
}

func validateGetS3FilesParams(q interface {
	Get(string) string
	Has(string) bool
}) (*s3FilesParams, error) {
	secretName := q.Get("secretName")
	bucket := q.Get("bucket")

	path := q.Get("path")
	if q.Has("path") && path == "" {
		return nil, fmt.Errorf("query parameter 'path' must be a non-empty string if provided")
	}
	const maxPrefixLen = 1024
	if len(path) > maxPrefixLen {
		return nil, fmt.Errorf("query parameter 'path' must not exceed %d characters", maxPrefixLen)
	}

	search := q.Get("search")
	if len(search) > maxPrefixLen {
		return nil, fmt.Errorf("query parameter 'search' must not exceed %d characters", maxPrefixLen)
	}
	if search != "" && strings.Contains(search, "/") {
		return nil, fmt.Errorf("query parameter 'search' must not contain '/' characters")
	}

	next := q.Get("next")
	if q.Has("next") && next == "" {
		return nil, fmt.Errorf("query parameter 'next' must be a non-empty string if provided")
	}

	limit := maxS3ListLimit
	if limitStr := q.Get("limit"); limitStr != "" {
		parsed, err := strconv.ParseInt(limitStr, 10, 32)
		if err != nil || parsed < 1 || parsed > int64(maxS3ListLimit) {
			return nil, fmt.Errorf("query parameter 'limit' must be a positive number between 1 and 1000")
		}
		limit = int32(parsed)
	}

	return &s3FilesParams{
		secretName: secretName,
		bucket:     bucket,
		path:       path,
		search:     search,
		next:       next,
		limit:      limit,
	}, nil
}
