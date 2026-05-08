package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"mime"
	"mime/multipart"
	"net"
	"net/http"
	"net/url"
	"path"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	"github.com/julienschmidt/httprouter"
	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/kubernetes"
	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
)

// s3MetadataTimeout is the deadline for read-only S3 metadata operations
// (ListObjects, HeadObject, GetCSVSchema, etc.) that should complete quickly.
// This bounds the response-header phase: if the endpoint accepts the TCP
// connection but never sends response headers, r.Context() alone won't cancel
// the call because net/http's WriteTimeout sets a conn deadline, not a context
// cancellation. File transfers (GetObject, UploadObject) are excluded because
// legitimate large payloads can exceed any static timeout.
const s3MetadataTimeout = 15 * time.Second

// resolvedS3 holds a ready-to-use S3 client and the resolved bucket name.
type resolvedS3 struct {
	client s3int.S3ClientInterface
	bucket string
}

var trailingNumberPattern = regexp.MustCompile(`^(.*)-(\d+)$`)

// ErrMaxCollisionsExceeded is returned when resolveNonCollidingS3Key exhausts all attempts
// to find a unique object key due to naming collisions.
var ErrMaxCollisionsExceeded = errors.New("max collision attempts exceeded")

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
		if errors.Is(err, repositories.ErrAmbiguousSecretKey) {
			app.badRequestResponse(w, r, err)
			return nil, false
		}
		app.serverErrorResponse(w, r, err)
		return nil, false
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
				app.badRequestResponse(w, r, fmt.Errorf("bucket parameter is required either as a query parameter or as AWS_S3_BUCKET in the secret"))
				return nil, false
			}
		}
	}

	// Dev-only: rewrite S3 endpoint to localhost via dynamic port-forward.
	// portForwardManager is nil in production (requires DevMode=true).
	if app.portForwardManager != nil && creds.EndpointURL != "" {
		if rewritten, pfErr := app.portForwardManager.ForwardURL(ctx, creds.EndpointURL); pfErr != nil {
			app.logger.Warn("dynamic port-forward failed for S3 endpoint, using original URL",
				"error", pfErr, "url", creds.EndpointURL)
		} else {
			creds.EndpointURL = rewritten
		}
	}

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

// isS3ConnectivityError checks whether an error is caused by a network-level
// failure to reach the S3 endpoint (e.g. connection timeout, DNS failure,
// connection refused, or a metadata timeout deadline). This lets handlers
// return an actionable 503 instead of a generic 500 when the endpoint is
// unreachable — common in air-gapped or misconfigured environments.
func isS3ConnectivityError(err error) bool {
	if errors.Is(err, context.DeadlineExceeded) {
		return true
	}
	if errors.Is(err, net.ErrClosed) {
		return true
	}
	var netErr net.Error
	if errors.As(err, &netErr) && netErr.Timeout() {
		return true
	}
	var opErr *net.OpError
	if errors.As(err, &opErr) && opErr.Op == "dial" {
		return true
	}
	var dnsErr *net.DNSError
	return errors.As(err, &dnsErr)
}

// s3ConnectivityErrorMessage returns a user-facing message for S3 connectivity failures.
func s3ConnectivityErrorMessage(bucket string) string {
	return fmt.Sprintf(
		"Unable to connect to the S3 storage endpoint for bucket '%s'. "+
			"The endpoint may be unreachable from this cluster. "+
			"If this is a disconnected or air-gapped environment, "+
			"verify the S3 endpoint URL in the data connection secret "+
			"points to a storage service accessible within the cluster network.",
		bucket,
	)
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
	if secretName != "" && !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, errors.New("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
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

	if v := queryParams.Get("view"); v != "" && v != "schema" {
		app.badRequestResponse(w, r, fmt.Errorf("unsupported view: %q (supported: schema)", v))
		return
	}

	if queryParams.Get("view") == "schema" {
		app.handleS3FileSchemaView(w, r, key, queryParams)
		return
	}

	s3, ok := app.resolveS3Client(w, r, strings.TrimSpace(secretName), queryParams.Get("bucket"))
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

		if isS3ConnectivityError(err) {
			app.serviceUnavailableResponseWithMessage(w, r, err, s3ConnectivityErrorMessage(s3.bucket))
			return
		}

		app.serverErrorResponse(w, r, err)
		return
	}

	defer objectReader.Close()

	sanitizedContentType := sanitizeS3ResponseContentType(contentType)
	w.Header().Set("Content-Type", sanitizedContentType)
	if !s3GetResponseTypeAllowsInlineViewing(sanitizedContentType) {
		w.Header().Set("Content-Disposition", "attachment")
		w.Header().Set("X-Content-Type-Options", "nosniff")
	}
	w.WriteHeader(http.StatusOK)
	_, err = io.Copy(w, objectReader)
	if err != nil {
		app.logger.Error("error streaming S3 object to response",
			"error", err, "bucket", s3.bucket, "key", key)
	}
}

const defaultS3PostMaxCollisionAttempts = 10

func (app *App) effectivePostS3CollisionAttempts() int {
	if app != nil && app.s3PostMaxCollisionAttempts > 0 {
		return app.s3PostMaxCollisionAttempts
	}
	return defaultS3PostMaxCollisionAttempts
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
	if !isValidDNS1123Subdomain(secretName) {
		app.badRequestResponse(w, r, errors.New("invalid secretName: must be a valid DNS-1123 subdomain (lowercase alphanumeric, '-', or '.', start/end with alphanumeric, max 253 chars)"))
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

	s3, ok := app.resolveS3Client(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	bucket := s3.bucket
	metadataCtx, metadataCancel := context.WithTimeout(r.Context(), s3MetadataTimeout)
	defer metadataCancel()
	resolvedKey, err := resolveNonCollidingS3Key(metadataCtx, s3.client, bucket, key, app.effectivePostS3CollisionAttempts())
	if err != nil {
		if errors.Is(err, ErrMaxCollisionsExceeded) {
			app.conflictResponse(w, r,
				fmt.Sprintf("unable to find unique filename after %d attempts; try a different base name",
					app.effectivePostS3CollisionAttempts()))
			return
		}
		if isS3ConnectivityError(err) {
			app.serviceUnavailableResponseWithMessage(w, r, err, s3ConnectivityErrorMessage(bucket))
			return
		}
		app.serverErrorResponse(w, r, fmt.Errorf("error resolving S3 key for upload: %w", err))
		return
	}

	maxUploadSize := app.s3PostMaxTotalBodyBytes()
	r.Body = http.MaxBytesReader(w, r.Body, maxUploadSize)

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

	contentType, ctypeErr := resolveCsvMultipartContentType(filePart)
	if ctypeErr != nil {
		app.badRequestResponse(w, r, ctypeErr)
		return
	}

	maxFilePartBytes := s3MaxUploadFileBytes
	if app.s3PostMaxFilePartBytes > 0 {
		maxFilePartBytes = app.s3PostMaxFilePartBytes
	}
	limitedFile := http.MaxBytesReader(nil, filePart, maxFilePartBytes)
	defer limitedFile.Close()
	if err := s3.client.UploadObject(r.Context(), bucket, resolvedKey, limitedFile, contentType); err != nil {
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
		if isS3ConnectivityError(err) {
			app.serviceUnavailableResponseWithMessage(w, r, err, s3ConnectivityErrorMessage(bucket))
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
	return "", ErrMaxCollisionsExceeded
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

// resolveCsvMultipartContentType validates CSV-only uploads and returns text/csv for S3 storage.
// Accepts text/csv; application/octet-stream or missing Content-Type when the filename ends with .csv.
func resolveCsvMultipartContentType(part *multipart.Part) (string, error) {
	raw := strings.TrimSpace(part.Header.Get("Content-Type"))
	fn := strings.ToLower(strings.TrimSpace(part.FileName()))

	if raw == "" {
		if strings.HasSuffix(fn, ".csv") {
			return "text/csv", nil
		}
		return "", errors.New("only CSV files are supported: use a .csv filename or Content-Type text/csv")
	}

	mediaType, _, err := mime.ParseMediaType(raw)
	if err != nil {
		return "", fmt.Errorf("invalid Content-Type: %w", err)
	}
	mediaType = strings.ToLower(mediaType)

	switch mediaType {
	case "text/csv":
		return "text/csv", nil
	case "application/octet-stream":
		if strings.HasSuffix(fn, ".csv") {
			return "text/csv", nil
		}
		return "", errors.New("only CSV files are supported (application/octet-stream requires a .csv filename)")
	default:
		return "", errors.New("only CSV files are supported (Content-Type must be text/csv, or application/octet-stream with a .csv filename)")
	}
}

// sanitizeS3ResponseContentType normalizes S3 metadata on GET. text/csv and application/json are
// echoed for AutoML pipelines; other types become application/octet-stream so arbitrary S3
// metadata cannot set executable types under the dashboard origin.
func sanitizeS3ResponseContentType(v string) string {
	v = strings.TrimSpace(v)
	if v == "" {
		return "application/octet-stream"
	}
	mediaType, _, err := mime.ParseMediaType(v)
	if err != nil {
		return "application/octet-stream"
	}
	mediaType = strings.ToLower(mediaType)
	switch mediaType {
	case "text/csv":
		return "text/csv"
	case "application/json":
		return "application/json"
	default:
		return "application/octet-stream"
	}
}

func s3GetResponseTypeAllowsInlineViewing(sanitizedContentType string) bool {
	switch sanitizedContentType {
	case "text/csv", "application/json":
		return true
	default:
		return false
	}
}

func (app *App) handleS3FileSchemaView(w http.ResponseWriter, r *http.Request, key string, queryParams url.Values) {
	secretName := strings.TrimSpace(queryParams.Get("secretName"))

	s3, ok := app.resolveS3Client(w, r, secretName, queryParams.Get("bucket"))
	if !ok {
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), s3MetadataTimeout)
	defer cancel()

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

		if isS3ConnectivityError(err) {
			app.serviceUnavailableResponseWithMessage(w, r, err, s3ConnectivityErrorMessage(s3.bucket))
			return
		}

		app.serverErrorResponse(w, r, err)
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

// S3FilesEnvelope is the response envelope for GET /api/v1/s3/files.
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

	ctx, cancel := context.WithTimeout(r.Context(), s3MetadataTimeout)
	defer cancel()

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

		if isS3ConnectivityError(err) {
			app.serviceUnavailableResponseWithMessage(w, r, err, s3ConnectivityErrorMessage(s3.bucket))
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
