package api

import (
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// buildS3Request builds S3RequestContext from the HTTP request.
// Returns false and writes an error response if namespace is missing.
func (app *App) buildS3Request(w http.ResponseWriter, r *http.Request, secretName, bucketOverride string) (repositories.S3RequestContext, bool) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		app.badRequestResponse(w, r, fmt.Errorf("missing namespace in context — ensure AttachNamespace middleware is used first"))
		return repositories.S3RequestContext{}, false
	}
	return repositories.S3RequestContext{
		Namespace:  namespace,
		SecretName: strings.TrimSpace(secretName),
		Bucket:     strings.TrimSpace(bucketOverride),
	}, true
}

// handleS3RepoError classifies S3 repo errors and writes the appropriate HTTP response.
func (app *App) handleS3RepoError(w http.ResponseWriter, r *http.Request, err error, key string) {
	// K8s domain errors from credential resolution
	switch {
	case errors.Is(err, kubernetes.ErrNotFound):
		app.notFoundResponseWithMessage(w, r, err.Error())
		return
	case errors.Is(err, kubernetes.ErrForbidden):
		app.forbiddenResponse(w, r, err.Error())
		return
	case errors.Is(err, kubernetes.ErrUnauthorized):
		app.unauthorizedResponse(w, r, err.Error())
		return
	}
	// S3 domain errors
	if errors.Is(err, s3.ErrObjectNotFound) {
		app.notFoundResponseWithMessage(w, r, fmt.Sprintf("object %q not found in S3 storage", key))
		return
	}
	if errors.Is(err, s3.ErrBucketNotFound) {
		app.notFoundResponseWithMessage(w, r, "S3 bucket not found")
		return
	}
	if errors.Is(err, s3.ErrAccessDenied) {
		if key != "" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object %q", key))
		} else {
			app.forbiddenResponse(w, r, "access denied to S3 bucket")
		}
		return
	}
	// Credential/validation errors
	if errors.Is(err, kubernetes.ErrAmbiguousSecretKey) ||
		errors.Is(err, s3.ErrEndpointValidation) ||
		errors.Is(err, repositories.ErrS3Configuration) {
		app.badRequestResponse(w, r, err)
		return
	}
	if s3.IsConnectivityError(err) {
		app.serviceUnavailableResponseWithMessage(w, r, err,
			"Unable to connect to the S3 storage endpoint. Verify the endpoint URL in your data connection secret points to a reachable storage service.")
		return
	}
	app.serverErrorResponse(w, r, err)
}

// GetS3FileHandler retrieves a file from S3 storage.
// Path parameters:
//   - key (required): S3 object key to retrieve.
//
// Query parameters:
//   - secretName (optional): Kubernetes secret with S3 credentials.
//     If omitted, credentials are taken from the DSPA associated with the namespace.
//   - bucket (optional): S3 bucket; ignored on the DSPA path.
func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName != "" {
		if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
			app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: %w", err))
			return
		}
	}

	key, err := url.PathUnescape(ps.ByName("key"))
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid URL encoding in path parameter 'key': %w", err))
		return
	}
	if key == "" {
		app.badRequestResponse(w, r, errors.New("path parameter 'key' is required and cannot be empty"))
		return
	}

	req, ok := app.buildS3Request(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	objectReader, contentType, err := app.repositories.S3.GetObject(r.Context(), req, key)
	if err != nil {
		app.handleS3RepoError(w, r, err, key)
		return
	}
	defer objectReader.Close()

	sanitizedContentType := sanitizeUploadContentType(contentType)
	if isInlineDangerousContentType(contentType) || sanitizedContentType == "application/octet-stream" {
		w.Header().Set("Content-Disposition", "attachment")
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}
	// Same normalization as POST uploads so GET cannot echo arbitrary S3 metadata types.
	w.Header().Set("Content-Type", sanitizedContentType)

	w.WriteHeader(http.StatusOK)
	_, err = io.Copy(w, objectReader)
	if err != nil {
		// Log the error but can't send error response as headers are already written
		app.logger.Error("error streaming S3 object to response",
			"error", err,
			"key", key,
		)
	}
}

const defaultS3PostMaxCollisionAttempts = 10

func (app *App) effectivePostS3CollisionAttempts() int {
	if app != nil && app.s3PostMaxCollisionAttempts > 0 {
		return app.s3PostMaxCollisionAttempts
	}
	return defaultS3PostMaxCollisionAttempts
}

// effectiveFilePartMaxBytes returns the cap for the file part body.
func (app *App) effectiveFilePartMaxBytes() int64 {
	if app.s3PostMaxFilePartBytes > 0 {
		return app.s3PostMaxFilePartBytes
	}
	return s3MaxUploadFileBytes
}

// extractMultipartFilePart caps the total body, reads through the multipart stream,
// discards non-file parts, and returns the "file" part. Writes an error response
// and returns a non-nil error if anything goes wrong.
func (app *App) extractMultipartFilePart(w http.ResponseWriter, r *http.Request) (*multipart.Part, error) {
	r.Body = http.MaxBytesReader(w, r.Body, app.s3PostMaxTotalBodyBytes())

	mr, err := r.MultipartReader()
	if err != nil {
		if isS3PostRequestBodyTooLarge(err) {
			app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
		} else {
			app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart request: %w", err))
		}
		return nil, err
	}
	if mr == nil {
		app.badRequestResponse(w, r, errors.New("request must be multipart/form-data with a boundary"))
		return nil, errors.New("nil multipart reader")
	}

	for {
		part, nextErr := mr.NextPart()
		if nextErr == io.EOF {
			break
		}
		if nextErr != nil {
			if isS3PostRequestBodyTooLarge(nextErr) {
				app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
			} else {
				app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", nextErr))
			}
			return nil, nextErr
		}
		if part.FormName() == "file" {
			return part, nil
		}
		if _, copyErr := io.Copy(io.Discard, part); copyErr != nil {
			if isS3PostRequestBodyTooLarge(copyErr) {
				app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
			} else {
				app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", copyErr))
			}
			return nil, copyErr
		}
	}

	app.badRequestResponse(w, r, errors.New("missing 'file' part in multipart form"))
	return nil, errors.New("no file part")
}

// PostS3FileHandler uploads a file to S3 storage using credentials from a Kubernetes secret.
// Path parameters: key (required).
// Query parameters: namespace, secretName (required); bucket (optional, uses AWS_S3_BUCKET from secret if not provided).
// Request body: multipart/form-data with a file part named "file". Streams the file to S3 without buffering.
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) PostS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, errors.New("query parameter 'secretName' is required and cannot be empty"))
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: %w", err))
		return
	}

	key, err := url.PathUnescape(ps.ByName("key"))
	if err != nil {
		app.badRequestResponse(w, r, fmt.Errorf("invalid URL encoding in path parameter 'key': %w", err))
		return
	}
	if key == "" {
		app.badRequestResponse(w, r, errors.New("path parameter 'key' is required and cannot be empty"))
		return
	}

	req, ok := app.buildS3Request(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	filePart, err := app.extractMultipartFilePart(w, r)
	if err != nil {
		return
	}

	contentType := sanitizeUploadContentType(filePart.Header.Get("Content-Type"))

	// MaxBytesReader's first arg is the ResponseWriter used by net/http.Server to force-close the
	// connection when the limit is exceeded. We pass nil because this reader is used for an S3 upload
	// body, not an inbound server request body—only the read-limit and *MaxBytesError behavior matter.
	limitedFile := http.MaxBytesReader(nil, filePart, app.effectiveFilePartMaxBytes())
	defer limitedFile.Close()

	resolvedKey, err := app.repositories.S3.UploadFile(r.Context(), req, key, limitedFile, contentType, app.effectivePostS3CollisionAttempts())
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, s3FilePartTooLargeMsg)
			return
		}
		if errors.Is(err, s3.ErrMaxCollisionsExceeded) {
			app.conflictResponse(w, r,
				fmt.Sprintf("unable to find unique filename after %d attempts; try a different base name",
					app.effectivePostS3CollisionAttempts()))
			return
		}
		app.handleS3RepoError(w, r, err, key)
		return
	}

	body := map[string]any{
		"uploaded": true,
		"key":      resolvedKey,
	}
	_ = app.WriteJSON(w, http.StatusCreated, body, nil)
}

// rejectDeclaredOversizedS3Post returns 413 when Content-Length is set and exceeds
// s3PostMaxTotalBodyBytes. Chunked or unknown length passes here; PostS3FileHandler still wraps
// r.Body with http.MaxBytesReader before MultipartReader so total bytes read are capped.
func (app *App) rejectDeclaredOversizedS3Post(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if app.s3PostDeclaredBodyExceedsLimit(r) {
			app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
			return
		}
		next(w, r, ps)
	}
}

func isS3PostRequestBodyTooLarge(err error) bool {
	var maxBytesErr *http.MaxBytesError
	return err != nil && errors.As(err, &maxBytesErr)
}

// Upload vs GET for HTML and other inline-unsafe types:
// Users may upload pipeline input files (e.g. text/html) that must be stored in S3 with an
// accurate Content-Type — see allowedS3UploadMediaTypes. The UI does not need to render those
// objects inline in the browser; serving them inline from this origin would risk XSS. For the
// same media types, GetS3FileHandler therefore uses dangerousS3GetMediaTypes / isInlineDangerousContentType
// to force Content-Disposition: attachment and nosniff. Allowing upload as text/html but
// downloading as attachment is intentional: store faithfully for RAG input; never execute in-dashboard.
//
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

// allowedS3UploadMediaTypes are the only multipart part Content-Types we persist to S3.
// Anything else is stored as application/octet-stream so GET cannot echo arbitrary
// caller-controlled MIME types (e.g. image/svg+xml, application/javascript) under the dashboard origin.
// Includes text/html so pipeline input can be stored correctly; GET still forces download for HTML
// (see the "Upload vs GET" comment before dangerousS3GetMediaTypes).
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

// S3FilesEnvelope is the response envelope for GET /api/v1/s3/files.
type S3FilesEnvelope Envelope[s3.ListObjectsResponse, None]

// GetS3FilesHandler retrieves files from S3 storage using credentials from a Kubernetes secret.
func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Validate parameters
	parameters, err := validateGetS3FilesHandlerParameters(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	req, ok := app.buildS3Request(w, r, parameters.SecretName, parameters.Bucket)
	if !ok {
		return
	}

	result, err := app.repositories.S3.ListObjects(r.Context(), req, s3.ListObjectsOptions{
		Path:   parameters.Path,
		Search: parameters.Search,
		Next:   parameters.Next,
		Limit:  parameters.Limit,
	})
	if err != nil {
		app.handleS3RepoError(w, r, err, "")
		return
	}

	if result == nil {
		app.serverErrorResponse(w, r, errors.New("unexpected nil response from S3 ListObjects"))
		return
	}

	response := S3FilesEnvelope{
		Data:     *result,
		Metadata: &struct{}{},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

type s3FilesParams struct {
	SecretName string
	Bucket     string
	Path       string
	Search     string
	Next       string
	Limit      int32
}

func validateGetS3FilesHandlerParameters(r *http.Request) (*s3FilesParams, error) {
	queryParams := r.URL.Query()

	// secretName is optional — when absent the handler falls back to DSPA object storage context.
	secretName := queryParams.Get("secretName")
	if secretName != "" {
		if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
			return nil, fmt.Errorf("invalid secretName: %w", err)
		}
	}

	bucket := queryParams.Get("bucket")

	path := queryParams.Get("path")
	if queryParams.Has("path") && path == "" {
		return nil, errors.New("query parameter 'path' must be a non-empty string if provided")
	}

	const maxPrefixLength = 1024
	if len(path) > maxPrefixLength {
		return nil, fmt.Errorf("query parameter 'path' must not exceed %d characters", maxPrefixLength)
	}

	search := queryParams.Get("search")
	if len(search) > maxPrefixLength {
		return nil, fmt.Errorf("query parameter 'search' must not exceed %d characters", maxPrefixLength)
	}
	if search != "" && strings.Contains(search, "/") {
		return nil, errors.New("query parameter 'search' must not contain '/' characters")
	}

	next := queryParams.Get("next")
	if queryParams.Has("next") && next == "" {
		return nil, errors.New("query parameter 'next' must be a non-empty string if provided")
	}

	const maxS3ListLimit int32 = 1000
	var limit = maxS3ListLimit
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
