package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net/http"
	"path"
	"regexp"
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

var trailingNumberPattern = regexp.MustCompile(`^(.*)-(\d+)$`)

// resolvedS3 holds a ready-to-use S3 client and the resolved bucket name.
type resolvedS3 struct {
	client s3int.S3ClientInterface
	bucket string
}

// resolveS3Client extracts identity and namespace from the request context,
// fetches S3 credentials (from DSPA context or a named Kubernetes secret), resolves
// the bucket, and returns a ready-to-use S3 client.
// When secretName is empty the function falls back to the DSPAObjectStorageKey injected
// by attachPipelineClientIfNeeded; if neither is available a 400 is returned.
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

	client, err := app.kubernetesClientFactory.GetClient(ctx)
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("failed to get Kubernetes client: %w", err))
		return nil, false
	}

	var creds *s3int.S3Credentials
	var dspaStorage *models.DSPAObjectStorage

	if secretName == "" {
		// DSPA path: use DSPAObjectStorageKey injected by attachPipelineClientIfNeeded.
		if storage, ok := ctx.Value(constants.DSPAObjectStorageKey).(*models.DSPAObjectStorage); ok && storage != nil {
			dspaStorage = storage
			creds, err = app.repositories.S3.GetS3CredentialsFromDSPA(ctx, client, namespace, dspaStorage, identity)
			if err != nil {
				var statusErr *apierrors.StatusError
				if errors.As(err, &statusErr) {
					if apierrors.IsNotFound(statusErr) {
						app.notFoundResponseWithMessage(w, r, fmt.Sprintf("secret '%s' not found in namespace '%s'", dspaStorage.SecretName, namespace))
						return nil, false
					}
					if apierrors.IsForbidden(statusErr) {
						app.forbiddenResponse(w, r, fmt.Sprintf("access to secret '%s' is forbidden", dspaStorage.SecretName))
						return nil, false
					}
				}
				if errors.Is(err, repositories.ErrAmbiguousSecretKey) {
					app.badRequestResponse(w, r, err)
					return nil, false
				}
				app.serverErrorResponse(w, r, err)
				return nil, false
			}
		} else {
			app.badRequestResponse(w, r, errors.New("query parameter 'secretName' is required when no DSPA object storage config is available"))
			return nil, false
		}
	} else {
		creds, err = app.getS3CredentialsFromSecret(ctx, client, namespace, secretName, identity)
		if err != nil {
			var httpErr *integrations.HTTPError
			if errors.As(err, &httpErr) {
				if httpErr.StatusCode == http.StatusUnauthorized {
					app.unauthorizedResponse(w, r, httpErr.Message)
					return nil, false
				}
				app.errorResponse(w, r, httpErr)
				return nil, false
			}
			app.serverErrorResponse(w, r, err)
			return nil, false
		}
	}

	// Resolve bucket.
	// SECURITY MODEL:
	//   - DSPA path: The DSPA-configured bucket always wins. Caller-supplied override
	//     is IGNORED to prevent bucket substitution and oracle-enumeration attacks.
	//   - secretName path: Caller-supplied bucketOverride IS ACCEPTED to allow flexible
	//     bucket access. The secret's IAM credentials determine authorization scope.
	//     Administrators MUST configure secrets with least-privilege IAM policies scoped
	//     to specific buckets to prevent unauthorized access.
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
				app.badRequestResponse(w, r, fmt.Errorf("bucket is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
				return nil, false
			}
		}
	}

	// TODO [ PR-Feedback: AI ] Gustavo + Chris **HANDLED IN FUTURE PR**
	//   A new AWS S3 client is created on every request. The AWS SDK client
	//   is designed for reuse (connection pooling, TLS session caching). Consider caching
	//   clients by credential identity (e.g. namespace/secretName) with a sync.Map or TTL cache.
	s3Client, err := app.s3ClientFactory.CreateClient(creds)
	if err != nil {
		if errors.Is(err, s3int.ErrEndpointValidation) {
			app.badRequestResponse(w, r, err)
			return nil, false
		}
		app.serverErrorResponse(w, r, fmt.Errorf("failed to create S3 client: %w", err))
		return nil, false
	}

	return &resolvedS3{client: s3Client, bucket: bucket}, true
}

// GetS3FileHandler retrieves a file from S3 storage using credentials from a Kubernetes secret.
// Query parameters:
//   - namespace (required): The Kubernetes namespace containing the secret
//   - secretName (optional): Name of the Kubernetes secret holding S3 credentials.
//     If omitted, the secret name is taken from the DSPA associated with the
//     Pipeline Server in this namespace (set by AttachPipelineServerClient middleware).
//   - bucket (optional): The S3 bucket name; if not provided, will use AWS_S3_BUCKET from the secret
//   - key (required): The S3 object key to retrieve
func (app *App) GetS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	queryParams := r.URL.Query()

	// Resolve S3 credentials from one of two sources:
	//   1. DSPA object storage config injected by AttachPipelineServerClient (primary in production).
	//      Uses the credential field names and endpoint coordinates from the DSPA spec, so it
	//      works for both external S3 and managed MinIO without requiring the caller to know
	//      which secret is in use.
	//   2. Explicit secretName query parameter (override / development path).
	//      Falls back to conventional AWS_* field names for the secret's credential keys.
	secretName := queryParams.Get("secretName")
	if secretName != "" && !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, fmt.Errorf("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

	key := strings.TrimSpace(queryParams.Get("key"))
	if key == "" {
		app.badRequestResponse(w, r, errors.New("query parameter 'key' is required and cannot be empty"))
		return
	}

	s3, ok := app.resolveS3Client(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	ctx := r.Context()
	bucket := s3.bucket
	objectReader, contentType, err := s3.client.GetObject(ctx, bucket, key)
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

		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied to S3 object '%s/%s'", bucket, key))
			return
		}

		app.serverErrorResponse(w, r, fmt.Errorf("error retrieving file from S3: %w", err))
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

const defaultS3PostMaxCollisionAttempts = 10

func (app *App) effectivePostS3CollisionAttempts() int {
	if app != nil && app.s3PostMaxCollisionAttempts > 0 {
		return app.s3PostMaxCollisionAttempts
	}
	return defaultS3PostMaxCollisionAttempts
}

// PostS3FileHandler uploads a file to S3 storage using credentials from a Kubernetes secret.
// Query parameters: namespace, secretName, key (required); bucket (optional, uses AWS_S3_BUCKET from secret if not provided).
// Request body: multipart/form-data with a file part named "file". Streams the file to S3 without buffering.
// Candidate keys are chosen via HeadObject; the file is streamed to S3 once with If-None-Match (no full-file buffer).
// If HeadObject and PUT disagree (concurrent writer), the handler returns 409 Conflict without retrying.
//
// Note: namespace is provided via the AttachNamespace middleware
func (app *App) PostS3FileHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	queryParams := r.URL.Query()

	secretName := queryParams.Get("secretName")
	if secretName == "" {
		app.badRequestResponse(w, r, errors.New("query parameter 'secretName' is required and cannot be empty"))
		return
	}
	if !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, errors.New("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
		return
	}

	key := strings.TrimSpace(queryParams.Get("key"))
	if key == "" {
		app.badRequestResponse(w, r, errors.New("query parameter 'key' is required and cannot be empty"))
		return
	}

	s3, ok := app.resolveS3Client(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	ctx := r.Context()
	bucket := s3.bucket
	resolvedKey, err := resolveNonCollidingS3Key(ctx, s3.client, bucket, key, app.effectivePostS3CollisionAttempts())
	if err != nil {
		app.serverErrorResponse(w, r, fmt.Errorf("error resolving S3 key for upload: %w", err))
		return
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
			app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
			return
		}
		app.badRequestResponse(w, r, fmt.Errorf("failed to parse multipart request: %w", err))
		return
	}
	if mr == nil {
		app.badRequestResponse(w, r, errors.New("request must be multipart/form-data with a boundary"))
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
				app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
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
				app.payloadTooLargeResponse(w, r, s3PayloadTooLargeMsg)
				return
			}
			app.badRequestResponse(w, r, fmt.Errorf("reading multipart: %w", copyErr))
			return
		}
	}

	if filePart == nil {
		app.badRequestResponse(w, r, errors.New("missing 'file' part in multipart form"))
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
	if err := s3.client.UploadObject(ctx, bucket, resolvedKey, limitedFile, contentType); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			app.payloadTooLargeResponse(w, r, s3FilePartTooLargeMsg)
			return
		}
		if errors.Is(err, s3int.ErrObjectAlreadyExists) {
			app.conflictResponse(w, r, fmt.Sprintf("object key %q already exists in S3 (upload conflict); retry with a different key", resolvedKey))
			return
		}
		var accessDenied interface{ ErrorCode() string }
		if errors.As(err, &accessDenied) && accessDenied.ErrorCode() == "AccessDenied" {
			app.forbiddenResponse(w, r, fmt.Sprintf("access denied uploading to S3 '%s/%s'", bucket, resolvedKey))
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("error uploading file to S3: %w", err))
		return
	}

	body := map[string]any{
		"uploaded": true,
		"key":      resolvedKey,
	}
	_ = app.WriteJSON(w, http.StatusCreated, body, nil)
}

// resolveNonCollidingS3Key picks a candidate object key using HeadObject only (no upload body read).
// When the requested key exists, it tries name-1, name-2, … up to maxSuffixAttempts times.
func resolveNonCollidingS3Key(
	ctx context.Context,
	client s3int.S3ClientInterface,
	bucket string,
	requestedKey string,
	maxCollisionAttempts int,
) (string, error) {
	exists, err := client.ObjectExists(ctx, bucket, requestedKey)
	if err != nil {
		return "", err
	}
	if !exists {
		return requestedKey, nil
	}

	dir, name := splitS3ObjectPath(requestedKey)
	stem, ext := splitNameAndExtension(name)
	stemBase, nextIndex := splitStemAndNextIndex(stem)

	for range maxCollisionAttempts {
		candidateName := fmt.Sprintf("%s-%d%s", stemBase, nextIndex, ext)
		candidateKey := dir + candidateName

		candidateExists, checkErr := client.ObjectExists(ctx, bucket, candidateKey)
		if checkErr != nil {
			return "", checkErr
		}
		if !candidateExists {
			return candidateKey, nil
		}
		nextIndex++
	}
	return "", fmt.Errorf("failed to resolve non-colliding S3 key after %d attempts", maxCollisionAttempts)
}

func splitS3ObjectPath(key string) (dir string, name string) {
	lastSlashIndex := strings.LastIndex(key, "/")
	if lastSlashIndex == -1 {
		return "", key
	}
	return key[:lastSlashIndex+1], key[lastSlashIndex+1:]
}

func splitNameAndExtension(fileName string) (stem string, ext string) {
	ext = path.Ext(fileName)
	if ext == "" {
		return fileName, ""
	}
	stem = strings.TrimSuffix(fileName, ext)
	if stem == "" {
		return fileName, ""
	}
	return stem, ext
}

func splitStemAndNextIndex(stem string) (base string, nextIndex int) {
	match := trailingNumberPattern.FindStringSubmatch(stem)
	if len(match) != 3 {
		return stem, 1
	}

	parsedIndex, err := strconv.Atoi(match[2])
	if err != nil {
		return stem, 1
	}
	return match[1], parsedIndex + 1
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

// GetS3FilesHandler retrieves files from S3 storage using credentials from a Kubernetes secret.
func (app *App) GetS3FilesHandler(w http.ResponseWriter, r *http.Request, _ httprouter.Params) {
	// Validate parameters
	parameters, err := validateGetS3FilesHandlerParameters(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	s3, ok := app.resolveS3Client(w, r, parameters.SecretName, parameters.Bucket)
	if !ok {
		return
	}

	ctx := r.Context()
	bucket := s3.bucket
	result, err := s3.client.ListObjects(ctx, bucket, s3int.ListObjectsOptions{
		Path:   parameters.Path,
		Search: parameters.Search,
		Next:   parameters.Next,
		Limit:  parameters.Limit,
	})
	if err != nil {
		var noBucket *types.NoSuchBucket
		if errors.As(err, &noBucket) {
			app.notFoundResponseWithMessage(w, r, fmt.Sprintf("bucket '%s' does not exist", bucket))
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
			if apierrors.IsForbidden(statusErr) {
				return nil, &integrations.HTTPError{
					StatusCode: http.StatusForbidden,
					ErrorResponse: integrations.ErrorResponse{
						Code:    strconv.Itoa(http.StatusForbidden),
						Message: fmt.Sprintf("access to secret '%s' in namespace '%s' is forbidden", secretName, namespace),
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

		if errors.Is(err, repositories.ErrMissingRequiredField) || errors.Is(err, repositories.ErrAmbiguousSecretKey) {
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

func validateGetS3FilesHandlerParameters(r *http.Request) (*s3FilesParams, error) {
	queryParams := r.URL.Query()

	// secretName is optional — when absent the handler falls back to DSPA object storage context.
	secretName := queryParams.Get("secretName")
	if secretName != "" && !isValidDNS1123Subdomain(secretName) {
		return nil, errors.New("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)")
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
