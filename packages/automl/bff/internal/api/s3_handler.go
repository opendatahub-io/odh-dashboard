package api

import (
	"errors"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// buildS3Request builds an S3RequestContext from the HTTP request.
// Writes an error response and returns false if the namespace is missing from context.
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

// handleS3RepoError classifies errors from S3 repository calls and writes the appropriate HTTP response.
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

	// S3 domain errors — translated from SDK types by the client layer
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

	// Credential resolution / validation bad-request errors
	if errors.Is(err, kubernetes.ErrAmbiguousSecretKey) ||
		errors.Is(err, s3.ErrEndpointValidation) ||
		errors.Is(err, repositories.ErrS3Configuration) ||
		errors.Is(err, repositories.ErrCSVUploadValidation) ||
		errors.Is(err, helper.ErrCSVValidation) {
		app.badRequestResponse(w, r, err)
		return
	}

	// Network connectivity
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

	if v := queryParams.Get("view"); v != "" && v != "schema" {
		app.badRequestResponse(w, r, fmt.Errorf("unsupported view: %q (supported: schema)", v))
		return
	}

	req, ok := app.buildS3Request(w, r, strings.TrimSpace(secretName), queryParams.Get("bucket"))
	if !ok {
		return
	}

	if queryParams.Get("view") == "schema" {
		app.getS3FileSchemaHandler(w, r, req, key)
		return
	}

	result, err := app.repositories.S3.GetObject(r.Context(), req, key)
	if err != nil {
		app.handleS3RepoError(w, r, err, key)
		return
	}
	defer result.Body.Close()

	w.Header().Set("Content-Type", result.ContentType)
	if result.ForceDownload {
		w.Header().Set("Content-Disposition", "attachment")
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}
	w.WriteHeader(http.StatusOK)
	if _, err = io.Copy(w, result.Body); err != nil {
		app.logger.Error("error streaming S3 object to response", "error", err, "key", key)
	}
}

// getS3FileSchemaHandler handles the ?view=schema path for GetS3FileHandler.
func (app *App) getS3FileSchemaHandler(w http.ResponseWriter, r *http.Request, req repositories.S3RequestContext, key string) {
	schemaResult, err := app.repositories.S3.GetCSVSchema(r.Context(), req, key)
	if err != nil {
		app.handleS3RepoError(w, r, err, key)
		return
	}

	response := map[string]any{
		"data": map[string]any{
			"columns":        schemaResult.Columns,
			"parse_warnings": schemaResult.ParseWarnings,
		},
	}

	if err := app.WriteJSON(w, http.StatusOK, response, nil); err != nil {
		app.logger.Error("error writing JSON response", "error", err)
	}
}

func (app *App) effectivePostS3CollisionAttempts() int {
	if app != nil && app.s3PostMaxCollisionAttempts > 0 {
		return app.s3PostMaxCollisionAttempts
	}
	return 0 // repo uses its own default
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

// PostS3FileHandler uploads a CSV file to S3 storage using credentials from a Kubernetes secret.
// Path parameters: key (required).
// Query parameters: namespace, secretName (required); bucket (optional, uses AWS_S3_BUCKET from secret if not provided).
// Request body: multipart/form-data with a file part named "file". Only CSV uploads are allowed: Content-Type
// text/csv, or application/octet-stream with a .csv filename (or empty Content-Type with a .csv filename).
// Candidate keys are chosen via HeadObject; the file is streamed to S3 once with If-None-Match (no full-file buffer).
// If HeadObject and PUT disagree (concurrent writer), the handler returns 409 Conflict without retrying.
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

	limitedFile := http.MaxBytesReader(w, filePart, app.effectiveFilePartMaxBytes())
	defer limitedFile.Close()

	resolvedKey, err := app.repositories.S3.UploadCSVFile(
		r.Context(), req, key, limitedFile,
		filePart.Header.Get("Content-Type"), filePart.FileName(),
		app.effectivePostS3CollisionAttempts(),
	)
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

// S3FilesEnvelope is the response envelope for GET /api/v1/s3/files.
type S3FilesEnvelope Envelope[s3.ListObjectsResponse, None]

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

	req, ok := app.buildS3Request(w, r, params.secretName, params.bucket)
	if !ok {
		return
	}

	result, err := app.repositories.S3.ListObjects(r.Context(), req, s3.ListObjectsOptions{
		Path:   params.path,
		Search: params.search,
		Next:   params.next,
		Limit:  params.limit,
	})
	if err != nil {
		app.handleS3RepoError(w, r, err, "")
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
