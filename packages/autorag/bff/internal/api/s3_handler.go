package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/autorag-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/autorag-library/bff/internal/models"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

type S3FilesEnvelope Envelope[models.S3ListObjectsResponse, None]

// TODO [ PR-Feedback: AI ] B2 - Gustavo:
//   GetS3FileHandler and GetS3FilesHandler duplicate ~40 lines of credential resolution
//   (identity check, namespace check, secretName validation, k8s client, getS3CredentialsFromSecret,
//   bucket fallback). Consider extracting a helper like:
//     func (app *App) resolveS3Client(w, r) (s3Client, bucket string, ok bool)
//   that returns false if it already wrote an error response. This eliminates the duplication
//   and ensures bug fixes apply to both handlers.

// GetS3FileHandler retrieves a file from S3 storage using credentials from a Kubernetes secret.
// Query parameters:
//   - namespace (required): The Kubernetes namespace containing the secret
//   - secretName (required): The name of the Kubernetes secret containing S3 credentials
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

	// TODO [ PR-Feedback: AI ] G3 - Gustavo:
	//   Use errors.New() instead of fmt.Errorf() for static error messages (no format verbs).
	//   fmt.Errorf is for interpolated messages. Same pattern repeated for 'key' below.
	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required and cannot be empty"))
		return
	}
	if !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

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

	// Get S3 credentials from the secret
	creds, err := app.getS3CredentialsFromSecret(ctx, client, namespace, secretName, identity)
	if err != nil {
		var httpErr *integrations.HTTPError
		if errors.As(err, &httpErr) {
			if httpErr.StatusCode == http.StatusUnauthorized {
				app.unauthorizedResponse(w, r, httpErr.Message)
				return
			}
			app.errorResponse(w, r, httpErr)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Determine bucket: use query param if provided, otherwise use bucket from secret
	bucket := queryParams.Get("bucket")
	if bucket == "" {
		if creds.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
			return
		}
		bucket = creds.Bucket
	}

	// Create S3 client and retrieve the file
	s3Client := app.s3ClientFactory.CreateClient(creds)
	objectReader, contentType, err := s3Client.GetObject(ctx, bucket, key)
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

		// TODO [ PR-Feedback: AI ] G4 - Gustavo:
		//   Use `smithy.APIError` from "github.com/aws/smithy-go" instead of ad-hoc interface
		//   assertion `interface{ ErrorCode() string }`. This is the official AWS SDK pattern
		//   and won't silently break if the SDK changes error wrapping. Same in GetS3FilesHandler.
		//   Example: var apiErr smithy.APIError; errors.As(err, &apiErr) && apiErr.ErrorCode() == "AccessDenied"
		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", bucket, key))
			return
		}

		app.serverErrorResponse(w, r, fmt.Errorf("error retrieving file from S3: %w", err))
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

// GetS3FilesHandler retrieves files from S3 storage using credentials from a Kubernetes secret.
func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Get namespace from context (Note: namespace is provided via the AttachNamespace middleware)
	namespace, ok := ctx.Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context - ensure AttachNamespace middleware is used first"))
		return
	}

	// Validate parameters
	parameters, err := validateParameters(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	secretName := parameters.SecretName
	bucket := parameters.Bucket

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Get S3 credentials from the secret
	creds, err := app.getS3CredentialsFromSecret(ctx, client, namespace, secretName, identity)
	if err != nil {
		var httpErr *integrations.HTTPError
		if errors.As(err, &httpErr) {
			if httpErr.StatusCode == http.StatusUnauthorized {
				app.unauthorizedResponse(w, r, httpErr.Message)
				return
			}
			app.errorResponse(w, r, httpErr)
			return
		}
		app.serverErrorResponse(w, r, err)
		return
	}

	// Determine bucket: use query param if provided, otherwise fall back to bucket from secret
	if bucket == "" {
		if creds.Bucket == "" {
			app.badRequestResponse(w, r, fmt.Errorf("bucket is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
			return
		}
		bucket = creds.Bucket
	}

	// TODO [ PR-Feedback: AI ] Gustavo + Chris **HANDLED IN FUTURE PR**
	//    A new AWS S3 client is created on every request. The AWS SDK client
	//   is designed for reuse (connection pooling, TLS session caching). Consider caching
	//   clients by credential identity (e.g. namespace/secretName) with a sync.Map or TTL cache.
	// Create S3 client and list objects
	s3Client := app.s3ClientFactory.CreateClient(creds)
	result, err := s3Client.ListObjects(ctx, bucket, s3int.ListObjectsOptions{
		Path:   parameters.Path,
		Search: parameters.Search,
		Next:   parameters.Next,
		Limit:  parameters.Limit,
	})
	if err != nil {
		var noBucket *types.NoSuchBucket
		if errors.As(err, &noBucket) {
			// TODO [ PR-Feedback: AI ] B3 - Gustavo:
			//   err.Error() leaks the raw AWS SDK error (may contain account IDs, endpoint URLs).
			//   Use a sanitized message like: fmt.Sprintf("bucket '%s' does not exist", bucket)
			app.notFoundResponseWithMessage(w, r, err.Error())
			return
		}

		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 bucket '%s'", bucket))
			return
		}

		app.serverErrorResponse(w, r, err)
		return
	}

	response := S3FilesEnvelope{
		Data: *result,
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// TODO [ PR-Feedback: AI ] B1 - Gustavo:
//
//	Mixed spaces/tabs indentation in function signature. Go requires tabs.
//	Run `gofmt -w` on this file to fix. Same issue in repositories/s3.go:25-30.
func (app *App) getS3CredentialsFromSecret(
	ctx context.Context,
	client kubernetes.KubernetesClientInterface,
	namespace string,
	secretName string,
	identity *kubernetes.RequestIdentity,
) (*s3int.S3Credentials, error) {
	creds, err := app.repositories.S3.GetS3Credentials(ctx, client, namespace, secretName, identity)
	if err != nil {
		// Check if it's a Kubernetes API error and handle accordingly
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				return nil, &integrations.HTTPError{
					StatusCode: http.StatusNotFound,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusNotFound),
						Message: fmt.Sprintf("namespace '%s' or secret '%s' not found", namespace, secretName),
					},
				}
			}
			// TODO [ PR-Feedback: AI ] S1 - Gustavo:
			//   err.Error() passes the raw K8s error message to the client, which may contain
			//   internal cluster details (service account names, API server URLs, etc.).
			//   Use a sanitized message like:
			//     fmt.Sprintf("access to secret '%s' in namespace '%s' is forbidden", secretName, namespace)
			if apierrors.IsForbidden(statusErr) {
				return nil, &integrations.HTTPError{
					StatusCode: http.StatusForbidden,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusForbidden),
						Message: err.Error(),
					},
				}
			}
			if apierrors.IsUnauthorized(statusErr) {
				return nil, &integrations.HTTPError{
					StatusCode: http.StatusUnauthorized,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusUnauthorized),
						Message: "Access unauthorized",
					},
				}
			}
		}

		if errors.Is(err, repositories.ErrSecretNotFound) {
			return nil, &integrations.HTTPError{
				StatusCode: http.StatusNotFound,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: err.Error(),
				},
			}
		}

		if errors.Is(err, repositories.ErrMissingRequiredField) {
			return nil, &integrations.HTTPError{
				StatusCode: http.StatusBadRequest,
				ErrorResponse: integrations.ErrorResponse{
					Code:    strconv.Itoa(http.StatusBadRequest),
					Message: err.Error(),
				},
			}
		}

		return nil, err
	}

	return creds, nil
}

type s3FilesParams struct {
	SecretName string
	Bucket     string
	Path       string
	Search     string
	Next       string
	Limit      int32
}

func validateParameters(r *http.Request) (*s3FilesParams, error) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		return nil, errors.New("query parameter 'secretName' is required and cannot be empty")
	}
	if !isValidDNS1123Subdomain(secretName) {
		return nil, errors.New("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)")
	}

	bucket := queryParams.Get("bucket")

	path := queryParams.Get("path")
	if queryParams.Has("path") && path == "" {
		return nil, errors.New("query parameter 'path' must be a non-empty string if provided")
	}

	// TODO [ PR-Feedback: AI ] S2 - Gustavo:
	//   No max length validation on 'search' or 'path' query params. Very long strings
	//   are passed directly to S3 as prefix. Consider a max length check (e.g., 1024 chars).
	search := queryParams.Get("search")
	if search != "" && strings.Contains(search, "/") {
		return nil, errors.New("query parameter 'search' must not contain '/' characters")
	}

	next := queryParams.Get("next")
	if queryParams.Has("next") && next == "" {
		return nil, errors.New("query parameter 'next' must be a non-empty string if provided")
	}

	const maxS3ListLimit int32 = 1000
	var limit int32 = maxS3ListLimit
	if limitStr := queryParams.Get("limit"); limitStr != "" {
		parsed, err := strconv.ParseInt(limitStr, 10, 32)
		if err != nil || parsed < 1 || parsed > int64(maxS3ListLimit) {
			return nil, errors.New("query parameter 'limit' must be a positive number between 1 and 1000")
		}
		limit = int32(parsed)
	}

	return &s3FilesParams{
		SecretName: secretName,
		Bucket:     bucket,
		Path:       path,
		Search:     search,
		Next:       next,
		Limit:      limit,
	}, nil
}
