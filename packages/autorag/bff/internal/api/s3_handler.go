package api

import (
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/autorag-library/bff/internal/constants"
	"github.com/opendatahub-io/autorag-library/bff/internal/repositories"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

type S3Handler struct {
	logger *slog.Logger
	repo   *repositories.S3Repository
	// maxFilePartBytes is for package api tests only (see PostS3FileHandler).
	maxFilePartBytes int64
	// maxRequestBodyBytes caps total POST body in tests (0 = file max + multipart envelope).
	maxRequestBodyBytes int64
	// maxCollisionAttempts limits HeadObject-based key suffix attempts in tests (0 = default cap).
	maxCollisionAttempts int
}

// s3MaxUploadFileBytes is the maximum allowed size for the uploaded file (32 MiB).
const s3MaxUploadFileBytes int64 = 32 << 20

// s3MultipartMaxEnvelopeBytes is headroom for multipart boundaries and non-file form fields.
const s3MultipartMaxEnvelopeBytes int64 = 64 << 20 // 64 MiB

// s3PayloadTooLargeMsg is the error message when the total request body exceeds the maximum allowed size.
const s3PayloadTooLargeMsg = "request body exceeds maximum upload size (32 MiB plus allowance for multipart framing)"

// s3FilePartTooLargeMsg is the error message when the file part exceeds the maximum allowed size.
const s3FilePartTooLargeMsg = "file exceeds maximum size of 32 MiB"

// s3PostMaxTotalBodyBytes is the maximum allowed size of the entire POST body (multipart framing
// plus all parts). Matches rejectDeclaredOversizedS3Post and the MaxBytesReader wrapping r.Body
// before MultipartReader so chunked uploads cannot stream unbounded while skipping non-file parts.
func (h *S3Handler) s3PostMaxTotalBodyBytes() int64 {
	if h != nil && h.maxRequestBodyBytes > 0 {
		return h.maxRequestBodyBytes
	}
	return s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes
}

// s3PostDeclaredBodyExceedsLimit is true when the client sent a positive Content-Length larger than
// s3PostMaxTotalBodyBytes (fast reject). Unknown length (e.g. chunked) returns false; the handler
// still wraps r.Body with http.MaxBytesReader before MultipartReader.
func (h *S3Handler) s3PostDeclaredBodyExceedsLimit(r *http.Request) bool {
	if r.ContentLength <= 0 {
		return false
	}
	return r.ContentLength > h.s3PostMaxTotalBodyBytes()
}

// buildS3Request builds S3RequestContext from the HTTP request.
// Returns false and writes an error response if namespace is missing.
func (h *S3Handler) buildS3Request(w http.ResponseWriter, r *http.Request, secretName, bucketOverride string) (repositories.S3RequestContext, bool) {
	namespace, ok := r.Context().Value(constants.NamespaceHeaderParameterKey).(string)
	if !ok || namespace == "" {
		badRequestResponse(h.logger, w, r, "missing namespace in context — ensure AttachNamespace middleware is used first")
		return repositories.S3RequestContext{}, false
	}
	return repositories.S3RequestContext{
		Namespace:  namespace,
		SecretName: strings.TrimSpace(secretName),
		Bucket:     strings.TrimSpace(bucketOverride),
	}, true
}

// handleS3RepoError classifies S3 repo errors and writes the appropriate HTTP response.
func (h *S3Handler) handleS3RepoError(w http.ResponseWriter, r *http.Request, err error, key string) {
	// K8s domain errors from credential resolution
	switch {
	case errors.Is(err, kubernetes.ErrNotFound):
		notFoundResponseWithMessage(h.logger, w, r, err.Error())
		return
	case errors.Is(err, kubernetes.ErrForbidden):
		forbiddenResponse(h.logger, w, r, err.Error())
		return
	case errors.Is(err, kubernetes.ErrUnauthorized):
		unauthorizedResponse(h.logger, w, r, err.Error())
		return
	}

	// DSPA discovery errors (S3 GET without explicit secretName falls back to DSPA)
	if errors.Is(err, pipelines.ErrNoDSPAFound) {
		notFoundResponseWithMessage(h.logger, w, r, "no Pipeline Server (DSPipelineApplication) found in namespace")
		return
	}
	if errors.Is(err, pipelines.ErrDSPANotReady) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err,
			"Pipeline Server exists but is not ready - check that the APIServer component is running")
		return
	}

	// S3 domain errors
	if errors.Is(err, s3.ErrObjectNotFound) {
		notFoundResponseWithMessage(h.logger, w, r, fmt.Sprintf("object %q not found in S3 storage", key))
		return
	}
	if errors.Is(err, s3.ErrBucketNotFound) {
		notFoundResponseWithMessage(h.logger, w, r, "S3 bucket not found")
		return
	}
	if errors.Is(err, s3.ErrAccessDenied) {
		if key != "" {
			forbiddenResponse(h.logger, w, r, fmt.Sprintf("access denied to S3 object %q", key))
		} else {
			forbiddenResponse(h.logger, w, r, "access denied to S3 bucket")
		}
		return
	}
	if errors.Is(err, s3.ErrObjectAlreadyExists) {
		conflictResponse(h.logger, w, r, fmt.Sprintf("object key %q already exists in S3 (upload conflict); retry with a different key", key))
		return
	}

	// DSPA server-side misconfiguration (missing bucket, secret name, endpoint, credentials)
	if errors.Is(err, repositories.ErrDSPAConfiguration) {
		serviceUnavailableResponseWithMessage(h.logger, w, r, err, err.Error())
		return
	}
	// Credential resolution / validation bad-request errors
	if errors.Is(err, s3.ErrInvalidKey) ||
		errors.Is(err, kubernetes.ErrAmbiguousSecretKey) ||
		errors.Is(err, s3.ErrEndpointValidation) ||
		errors.Is(err, repositories.ErrS3Configuration) {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}

	// Network connectivity
	if s3.IsConnectivityError(err) {
		badGatewayResponseWithMessage(h.logger, w, r, err,
			"Unable to connect to the S3 storage endpoint. "+
				"The endpoint may be unreachable from this cluster. "+
				"If this is a disconnected or air-gapped environment, "+
				"verify the S3 endpoint URL in the data connection secret "+
				"points to a storage service accessible within the cluster network.")
		return
	}
	serverErrorResponse(h.logger, w, r, err)
}

// GetS3FileHandler retrieves a file from S3 storage.
// Path parameters:
//   - key (required): S3 object key to retrieve.
//
// Query parameters:
//   - secretName (optional): Kubernetes secret with S3 credentials.
//     If omitted, credentials are taken from the DSPA associated with the namespace.
//   - bucket (optional): S3 bucket; ignored on the DSPA path.
func (h *S3Handler) GetS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName != "" {
		if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
			badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid secretName: %s", err))
			return
		}
	}

	key, err := url.PathUnescape(ps.ByName("key"))
	if err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid URL encoding in path parameter 'key': %s", err))
		return
	}
	if key == "" {
		badRequestResponse(h.logger, w, r, "path parameter 'key' is required and cannot be empty")
		return
	}

	req, ok := h.buildS3Request(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	result, err := h.repo.GetObject(r.Context(), req, key)
	if err != nil {
		h.handleS3RepoError(w, r, err, key)
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
		h.logger.Error("error streaming S3 object to response", "error", err, "key", key)
	}
}

func (h *S3Handler) effectivePostS3CollisionAttempts() int {
	if h != nil && h.maxCollisionAttempts > 0 {
		return h.maxCollisionAttempts
	}
	return 0 // repo uses its own default
}

// effectiveFilePartMaxBytes returns the cap for the file part body.
func (h *S3Handler) effectiveFilePartMaxBytes() int64 {
	if h.maxFilePartBytes > 0 {
		return h.maxFilePartBytes
	}
	return s3MaxUploadFileBytes
}

// extractMultipartFilePart caps the total body, reads through the multipart stream,
// discards non-file parts, and returns the "file" part. Writes an error response
// and returns a non-nil error if anything goes wrong.
func (h *S3Handler) extractMultipartFilePart(w http.ResponseWriter, r *http.Request) (*multipart.Part, error) {
	r.Body = http.MaxBytesReader(w, r.Body, h.s3PostMaxTotalBodyBytes())

	mr, err := r.MultipartReader()
	if err != nil {
		if isS3PostRequestBodyTooLarge(err) {
			payloadTooLargeResponse(h.logger, w, r, s3PayloadTooLargeMsg)
		} else {
			badRequestResponse(h.logger, w, r, fmt.Sprintf("failed to parse multipart request: %s", err))
		}
		return nil, err
	}
	if mr == nil {
		badRequestResponse(h.logger, w, r, "request must be multipart/form-data with a boundary")
		return nil, errors.New("nil multipart reader")
	}

	for {
		part, nextErr := mr.NextPart()
		if nextErr == io.EOF {
			break
		}
		if nextErr != nil {
			if isS3PostRequestBodyTooLarge(nextErr) {
				payloadTooLargeResponse(h.logger, w, r, s3PayloadTooLargeMsg)
			} else {
				badRequestResponse(h.logger, w, r, fmt.Sprintf("reading multipart: %s", nextErr))
			}
			return nil, nextErr
		}
		if part.FormName() == "file" {
			return part, nil
		}
		if _, copyErr := io.Copy(io.Discard, part); copyErr != nil {
			if isS3PostRequestBodyTooLarge(copyErr) {
				payloadTooLargeResponse(h.logger, w, r, s3PayloadTooLargeMsg)
			} else {
				badRequestResponse(h.logger, w, r, fmt.Sprintf("reading multipart: %s", copyErr))
			}
			return nil, copyErr
		}
	}

	badRequestResponse(h.logger, w, r, "missing 'file' part in multipart form")
	return nil, errors.New("no file part")
}

// PostS3FileHandler uploads a file to S3 storage using credentials from a Kubernetes secret.
// Path parameters: key (required).
// Query parameters: namespace, secretName (required); bucket (optional, uses AWS_S3_BUCKET from secret if not provided).
// Request body: multipart/form-data with a file part named "file". Streams the file to S3 without buffering.
//
// Note: namespace is provided via the AttachNamespace middleware
func (h *S3Handler) PostS3FileHandler(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		badRequestResponse(h.logger, w, r, "query parameter 'secretName' is required and cannot be empty")
		return
	}
	if err := kubernetes.ValidateResourceName("secretName", secretName); err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid secretName: %s", err))
		return
	}

	key, err := url.PathUnescape(ps.ByName("key"))
	if err != nil {
		badRequestResponse(h.logger, w, r, fmt.Sprintf("invalid URL encoding in path parameter 'key': %s", err))
		return
	}
	if key == "" {
		badRequestResponse(h.logger, w, r, "path parameter 'key' is required and cannot be empty")
		return
	}

	req, ok := h.buildS3Request(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	filePart, err := h.extractMultipartFilePart(w, r)
	if err != nil {
		return
	}

	limitedFile := http.MaxBytesReader(w, filePart, h.effectiveFilePartMaxBytes())
	defer limitedFile.Close()

	resolvedKey, err := h.repo.UploadFile(r.Context(), req, key, limitedFile, filePart.Header.Get("Content-Type"), h.effectivePostS3CollisionAttempts())
	if err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			payloadTooLargeResponse(h.logger, w, r, s3FilePartTooLargeMsg)
			return
		}
		if errors.Is(err, s3.ErrMaxCollisionsExceeded) {
			conflictResponse(h.logger, w, r,
				fmt.Sprintf("unable to find unique filename after %d attempts; try a different base name",
					h.effectivePostS3CollisionAttempts()))
			return
		}
		h.handleS3RepoError(w, r, err, key)
		return
	}

	body := map[string]any{
		"uploaded": true,
		"key":      resolvedKey,
	}
	if err := writeJSON(w, http.StatusCreated, body, nil); err != nil {
		h.logger.Error("failed to write upload response", "error", err, "key", resolvedKey)
	}
}

// rejectDeclaredOversizedS3Post returns 413 when Content-Length is set and exceeds
// s3PostMaxTotalBodyBytes. Chunked or unknown length passes here; PostS3FileHandler still wraps
// r.Body with http.MaxBytesReader before MultipartReader so total bytes read are capped.
func (h *S3Handler) rejectDeclaredOversizedS3Post(next httprouter.Handle) httprouter.Handle {
	return func(w http.ResponseWriter, r *http.Request, ps httprouter.Params) {
		if h.s3PostDeclaredBodyExceedsLimit(r) {
			payloadTooLargeResponse(h.logger, w, r, s3PayloadTooLargeMsg)
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

// GetS3FilesHandler retrieves files from S3 storage using credentials from a Kubernetes secret.
func (h *S3Handler) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Validate parameters
	parameters, err := validateGetS3FilesHandlerParameters(r)
	if err != nil {
		badRequestResponse(h.logger, w, r, err.Error())
		return
	}

	req, ok := h.buildS3Request(w, r, parameters.SecretName, parameters.Bucket)
	if !ok {
		return
	}

	result, err := h.repo.ListObjects(r.Context(), req, s3.ListObjectsOptions{
		Path:   parameters.Path,
		Search: parameters.Search,
		Next:   parameters.Next,
		Limit:  parameters.Limit,
	})
	if err != nil {
		h.handleS3RepoError(w, r, err, "")
		return
	}

	if result == nil {
		serverErrorResponse(h.logger, w, r, errors.New("unexpected nil response from S3 ListObjects"))
		return
	}

	response := S3FilesEnvelope{
		Data:     *result,
		Metadata: &struct{}{},
	}

	if err := writeJSON(w, http.StatusOK, response, nil); err != nil {
		serverErrorResponse(h.logger, w, r, err)
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
