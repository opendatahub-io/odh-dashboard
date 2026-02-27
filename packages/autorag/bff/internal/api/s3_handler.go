package api

import (
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// GetS3FileHandler retrieves a file from S3 storage using credentials from a Kubernetes secret.
// Query parameters:
//   - namespace (required): The Kubernetes namespace containing the secret
//   - secretName (required): The name of the Kubernetes secret containing S3 credentials
//   - bucket (required): The S3 bucket name
//   - key (required): The S3 object key to retrieve
func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	ctx := r.Context()
	identity, ok := ctx.Value(constants.RequestIdentityKey).(*kubernetes.RequestIdentity)
	if !ok || identity == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing RequestIdentity in context"))
		return
	}

	// Parse query parameters
	queryParams := r.URL.Query()

	// Validate required parameters
	namespace := queryParams.Get("namespace")
	if namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'namespace' is required"))
		return
	}

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required"))
		return
	}

	bucket := queryParams.Get("bucket")
	if bucket == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'bucket' is required"))
		return
	}

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required"))
		return
	}

	// Get Kubernetes client
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	// Get S3 credentials from the secret
	creds, err := app.repositories.S3.GetS3Credentials(client, ctx, namespace, secretName, identity)
	if err != nil {
		// Check if it's a Kubernetes API error and handle accordingly
		var statusErr *apierrors.StatusError
		if errors.As(err, &statusErr) {
			if apierrors.IsNotFound(statusErr) {
				httpError := &HTTPError{
					StatusCode: http.StatusNotFound,
					Error: ErrorPayload{
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
			httpError := &HTTPError{
				StatusCode: http.StatusNotFound,
				Error: ErrorPayload{
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

		app.serverErrorResponse(w, r, err)
		return
	}

	// Retrieve the file from S3
	objectReader, contentType, err := app.repositories.S3.GetS3Object(ctx, creds, bucket, key)
	if err != nil {
		// Check if it's an S3 error (e.g., object not found, access denied)
		errStr := err.Error()
		if strings.Contains(errStr, "NoSuchKey") || strings.Contains(errStr, "NotFound") {
			httpError := &HTTPError{
				StatusCode: http.StatusNotFound,
				Error: ErrorPayload{
					Code:    strconv.Itoa(http.StatusNotFound),
					Message: fmt.Sprintf("object '%s' not found in bucket '%s'", key, bucket),
				},
			}
			app.errorResponse(w, r, httpError)
			return
		}

		if strings.Contains(errStr, "AccessDenied") || strings.Contains(errStr, "Forbidden") {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", bucket, key))
			return
		}

		app.serverErrorResponse(w, r, fmt.Errorf("error retrieving file from S3: %w", err))
		return
	}
	defer objectReader.Close()

	// Set response headers for streaming
	w.Header().Set("Content-Type", contentType)
	w.Header().Set("Transfer-Encoding", "chunked")

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
