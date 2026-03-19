package api

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"strconv"
	"strings"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations"
	"github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

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

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required and cannot be empty"))
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
	creds, err := app.repositories.S3.GetS3Credentials(ctx, client, namespace, secretName, identity)
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

		if isInvalidS3CredentialConfigError(err) {
			app.badRequestResponse(w, r, err)
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

		app.serverErrorResponse(w, r, fmt.Errorf("error retrieving file from S3: %w", err))
		return
	}

	// Ensure cleanup of the reader
	if closer, ok := objectReader.(io.Closer); ok {
		defer closer.Close()
	}

	sanitizedContentType := sanitizeUploadContentType(contentType)
	if isInlineDangerousContentType(contentType) || sanitizedContentType == "application/octet-stream" {
		w.Header().Set("Content-Disposition", "attachment")
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}
	// Same normalization as POST uploads so GET cannot echo arbitrary S3 metadata types.
	w.Header().Set("Content-Type", sanitizedContentType)

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

// PostS3FileHandler uploads a file to S3 storage using credentials from a Kubernetes secret.
// Query parameters: namespace, secretName, key (required); bucket (optional, uses AWS_S3_BUCKET from secret if not provided).
// Request body: multipart/form-data with a file part named "file". Streams the file to S3 without buffering.
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) PostS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
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

	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'secretName' is required and cannot be empty"))
		return
	}

	key := queryParams.Get("key")
	if key == "" {
		app.badRequestResponse(w, r, fmt.Errorf("query parameter 'key' is required and cannot be empty"))
		return
	}

	// Resolve credentials before reading the body so we fail fast without consuming large uploads.
	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return
	}

	creds, err := app.repositories.S3.GetS3Credentials(ctx, client, namespace, secretName, identity)
	if err != nil {
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
		if isInvalidS3CredentialConfigError(err) {
			app.badRequestResponse(w, r, err)
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

	maxUploadSize := app.s3PostMaxTotalBodyBytes()
	// Cap the entire request body so chunked/unknown-length clients cannot force the multipart
	// scanner (including io.Copy discard of non-file parts) to read without bound. Same limit as
	// rejectDeclaredOversizedS3Post for declared Content-Length.
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

	// Stream multipart body: do not buffer the entire file.
	mr, err := r.MultipartReader()
	if err != nil {
		if isS3PostRequestBodyTooLarge(err) {
			app.payloadTooLargeResponse(w, r, "request body exceeds maximum upload size (1 GiB plus allowance for multipart framing)")
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart request: %w", err))
		return
	}
	if mr == nil {
		app.badRequestResponse(w, r, fmt.Errorf("request must be multipart/form-data with a boundary"))
		return
	}

	var filePart *multipart.Part
	for {
		part, nextErr := mr.NextPart()
		if nextErr == io.EOF {
			break
		}
		if nextErr != nil {
			if isS3PostRequestBodyTooLarge(nextErr) {
				app.payloadTooLargeResponse(w, r, "request body exceeds maximum upload size (1 GiB plus allowance for multipart framing)")
				return
			}
			app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", nextErr))
			return
		}
		if part.FormName() == "file" {
			filePart = part
			break
		}
		_, copyErr := io.Copy(io.Discard, part)
		if copyErr != nil {
			if isS3PostRequestBodyTooLarge(copyErr) {
				app.payloadTooLargeResponse(w, r, "request body exceeds maximum upload size (1 GiB plus allowance for multipart framing)")
				return
			}
			app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", copyErr))
			return
		}
	}

	if filePart == nil {
		app.badRequestResponse(w, r, fmt.Errorf("missing 'file' part in multipart form"))
		return
	}

	contentType := sanitizeUploadContentType(filePart.Header.Get("Content-Type"))

	maxFilePartBytes := s3MaxUploadFileBytes
	if app.s3PostMaxFilePartBytes > 0 {
		maxFilePartBytes = app.s3PostMaxFilePartBytes
	}
	// MaxBytesReader’s first arg is the ResponseWriter used by net/http.Server to force-close the
	// connection when the limit is exceeded. We pass nil because this reader is used for an S3 upload
	// body, not an inbound server request body—only the read-limit and *MaxBytesError behavior matter.
	limitedFile := http.MaxBytesReader(nil, filePart, maxFilePartBytes)
	// MaxBytesReader.Close forwards to Part.Close, which drains the rest of the file part.
	defer limitedFile.Close()
	if err := app.repositories.S3.UploadS3Object(ctx, creds, bucket, key, limitedFile, contentType); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, "file exceeds maximum size of 1 GiB")
			return
		}
		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied uploading to S3 '%s/%s'", bucket, key))
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("error uploading file to S3: %w", err))
		return
	}

	body := map[string]bool{"uploaded": true}
	_ = app.WriteJSON(w, http.StatusCreated, body, nil)
}

// rejectDeclaredOversizedS3Post returns 413 when Content-Length is set and exceeds
// s3PostMaxTotalBodyBytes. Chunked or unknown length passes here; PostS3FileHandler still wraps
// r.Body with http.MaxBytesReader before MultipartReader so total bytes read are capped.
func (app *App) rejectDeclaredOversizedS3Post(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.s3PostDeclaredBodyExceedsLimit(r) {
			app.payloadTooLargeResponse(w, r, "request body exceeds maximum upload size (1 GiB plus allowance for multipart framing)")
			return
		}
		next(w, r, ps)
	}
}

func isS3PostRequestBodyTooLarge(err error) bool {
	var maxBytesErr *http.MaxBytesError
	return err != nil && errors.As(err, &maxBytesErr)
}

// dangerousS3GetMediaTypes are served with Content-Disposition: attachment and nosniff so the
// dashboard origin cannot be used as an XSS/SVG script vector when objects declare these types
// (including parameterized forms, e.g. text/html; charset=utf-8).
var dangerousS3GetMediaTypes = map[string]struct{}{
	"text/html":             {},
	"application/xhtml+xml": {},
	"image/svg+xml":         {},
}

func isInlineDangerousContentType(v string) bool {
	raw := strings.TrimSpace(v)
	mediaType, _, err := mime.ParseMediaType(raw)
	if err != nil {
		return false
	}
	mediaType = strings.ToLower(mediaType)
	_, ok := dangerousS3GetMediaTypes[mediaType]
	return ok
}

// isInvalidS3CredentialConfigError reports whether err is a credential/endpoint validation error
// (missing required field, invalid AWS_S3_ENDPOINT, or SSRF-blocked endpoint) that should be
// returned as 400 Bad Request rather than 500.
func isInvalidS3CredentialConfigError(err error) bool {
	if err == nil {
		return false
	}
	msg := err.Error()
	return strings.Contains(msg, "missing required field") ||
		strings.Contains(msg, "invalid AWS_S3_ENDPOINT") ||
		strings.Contains(msg, "HTTPS") ||
		strings.Contains(msg, "RFC-1918") ||
		strings.Contains(msg, "RFC 1122") ||
		strings.Contains(msg, "RFC 1112") ||
		strings.Contains(msg, "loopback") ||
		strings.Contains(msg, "link-local") ||
		strings.Contains(msg, "IPv6")
}

// allowedS3UploadMediaTypes are the only multipart part Content-Types we persist to S3.
// Anything else is stored as application/octet-stream so GET cannot echo arbitrary
// caller-controlled MIME types (e.g. image/svg+xml, application/javascript) under the dashboard origin.
var allowedS3UploadMediaTypes = map[string]struct{}{
	"application/json":     {},
	"application/markdown": {}, // some clients use this for .md
	"application/pdf":      {},
	"application/vnd.openxmlformats-officedocument.presentationml.presentation": {}, // .pptx
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document":   {}, // .docx
	// "application/x-yaml":   {},
	// "application/xml":      {},
	// "application/yaml":     {},
	"text/html":           {},
	"text/markdown":       {},
	"text/plain":          {},
	"text/x-web-markdown": {},
	"text/x-markdown":     {},
	// "text/x-yaml":        {},
	// "text/xml":           {},
	// "text/yaml":          {},
}

func sanitizeUploadContentType(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "application/octet-stream"
	}
	mediaType, _, err := mime.ParseMediaType(v)
	if err != nil {
		return "application/octet-stream"
	}
	mediaType = strings.ToLower(mediaType)
	if _, ok := allowedS3UploadMediaTypes[mediaType]; ok {
		return mediaType
	}
	return "application/octet-stream"
}
