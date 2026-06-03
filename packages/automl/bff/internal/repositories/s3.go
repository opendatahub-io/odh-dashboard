package repositories

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime"
	"strings"
	"time"

	helper "github.com/opendatahub-io/automl-library/bff/internal/helpers"
	kubernetes "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	pipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	s3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// ErrS3Configuration is returned when S3 credentials or storage configuration is
// missing or invalid (e.g., missing secret fields, missing bucket, bad DSPA spec).
var ErrS3Configuration = errors.New("S3 configuration error")

// ErrCSVUploadValidation is returned when an upload fails CSV content-type validation.
var ErrCSVUploadValidation = errors.New("CSV upload validation error")

const (
	s3KeyResolutionTimeout         = 15 * time.Second
	defaultMaxCollisionAttempts    = 10
)

// S3RequestContext captures the S3 access parameters available from an HTTP request.
// Handlers build this from query params and middleware-injected context, then pass
// it to S3Repository operations — keeping handler bodies to a single repo call.
//
// Bucket resolution semantics:
//   - SecretName path: Bucket overrides the secret's AWS_S3_BUCKET default. Either
//     may be empty as long as one provides a non-empty value.
//   - DSPA path (SecretName=""): Bucket is IGNORED. The DSPA-configured bucket is
//     always used to prevent caller-side bucket substitution attacks.
type S3RequestContext struct {
	Namespace  string
	SecretName string // empty = auto-discover DSPA in Namespace
	Bucket     string // caller-supplied override; DSPA path ignores this
}

// S3Repository handles S3 credential resolution (from K8s secrets or DSPA) and
// delegates S3 operations to the autox-core S3 service.
type S3Repository struct {
	s3Service        s3.Service
	k8sService       kubernetes.Service
	pipelinesService pipelines.Service
}

func NewS3Repository(
	s3Service s3.Service,
	k8sService kubernetes.Service,
	pipelinesService pipelines.Service,
) *S3Repository {
	return &S3Repository{
		s3Service:        s3Service,
		k8sService:       k8sService,
		pipelinesService: pipelinesService,
	}
}

// resolveCredsAndBucket is the single dispatch point for S3 credential resolution.
// It handles both the explicit-secret path and the DSPA auto-discovery path,
// including bucket resolution and the DSPA bucket security model.
func (r *S3Repository) resolveCredsAndBucket(ctx context.Context, req S3RequestContext) (s3.ConnectionOptions, string, error) {
	if req.SecretName != "" {
		return r.resolveFromSecret(ctx, req)
	}
	return r.resolveFromDSPA(ctx, req.Namespace)
}

func (r *S3Repository) resolveFromSecret(ctx context.Context, req S3RequestContext) (s3.ConnectionOptions, string, error) {
	secret, err := r.k8sService.GetSecret(ctx, req.Namespace, req.SecretName)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("error fetching secret %q from namespace %s: %w", req.SecretName, req.Namespace, err)
	}

	opts, defaultBucket, err := extractAWSS3ConnectionOptions(secret.Data)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("secret %q: %w", req.SecretName, err)
	}

	bucket := strings.TrimSpace(req.Bucket)
	if bucket == "" {
		bucket = defaultBucket
	}
	if bucket == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: bucket is required — supply ?bucket= or set AWS_S3_BUCKET in secret %q", ErrS3Configuration, req.SecretName)
	}

	return opts, bucket, nil
}

func (r *S3Repository) resolveFromDSPA(ctx context.Context, namespace string) (s3.ConnectionOptions, string, error) {
	dspa, err := r.pipelinesService.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("failed to discover DSPA in namespace %s: %w", namespace, err)
	}

	spec := dspa.ObjectStorage
	if spec == nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("DSPA %q in namespace %s has no object storage configured", dspa.Name, namespace)
	}
	if spec.SecretName == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: DSPA %q object storage spec is missing a secret name", ErrS3Configuration, dspa.Name)
	}
	if spec.EndpointURL == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: DSPA %q object storage spec is missing an endpoint URL", ErrS3Configuration, dspa.Name)
	}
	if spec.Bucket == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: DSPA %q object storage spec is missing a bucket — contact your administrator", ErrS3Configuration, dspa.Name)
	}

	secret, err := r.k8sService.GetSecret(ctx, namespace, spec.SecretName)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("error fetching DSPA secret %q from namespace %s: %w", spec.SecretName, namespace, err)
	}

	accessKeyID, err := kubernetes.LookupSecretValue(secret.Data, spec.AccessKeyField)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q: %w", spec.SecretName, err)
	}
	if accessKeyID == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: DSPA secret %q missing required field: %s", ErrS3Configuration, spec.SecretName, spec.AccessKeyField)
	}

	secretAccessKey, err := kubernetes.LookupSecretValue(secret.Data, spec.SecretKeyField)
	if err != nil {
		return s3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q: %w", spec.SecretName, err)
	}
	if secretAccessKey == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: DSPA secret %q missing required field: %s", ErrS3Configuration, spec.SecretName, spec.SecretKeyField)
	}

	region := spec.Region
	if region == "" {
		region = "us-east-1"
	}

	// Endpoint and bucket from spec are the authority for DSPA paths.
	// Secret overrides (AWS_S3_ENDPOINT, AWS_S3_BUCKET) follow the DSPA operator
	// convention for MinIO-style secrets and take precedence when present.
	endpointURL := spec.EndpointURL
	if secretEndpoint, lErr := kubernetes.LookupSecretValue(secret.Data, "AWS_S3_ENDPOINT"); lErr != nil {
		slog.Warn("ignoring ambiguous AWS_S3_ENDPOINT in DSPA secret, using spec value",
			"secret", spec.SecretName, "error", lErr)
	} else if secretEndpoint != "" {
		endpointURL = secretEndpoint
	}

	bucket := spec.Bucket
	if secretBucket, lErr := kubernetes.LookupSecretValue(secret.Data, "AWS_S3_BUCKET"); lErr != nil {
		slog.Warn("ignoring ambiguous AWS_S3_BUCKET in DSPA secret, using spec value",
			"secret", spec.SecretName, "error", lErr)
	} else if secretBucket != "" {
		bucket = secretBucket
	}

	return s3.ConnectionOptions{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		BaseEndpoint:    endpointURL,
	}, bucket, nil
}

// GetObject resolves credentials from req, retrieves the object at key, and applies
// content-type policy (sanitization + force-download classification).
// The caller is responsible for closing Result.Body.
func (r *S3Repository) GetObject(ctx context.Context, req S3RequestContext, key string) (*GetObjectResult, error) {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return nil, err
	}
	body, rawCT, err := r.s3Service.DownloadObject(ctx, opts, s3.DownloadObjectInput{Bucket: bucket, Key: key})
	if err != nil {
		return nil, err
	}
	sanitized := SanitizeResponseContentType(rawCT)
	return &GetObjectResult{
		Body:          body,
		ContentType:   sanitized,
		ForceDownload: !inlineAllowedTypes[sanitized],
	}, nil
}

// UploadObject resolves credentials from req and uploads body at key.
// Returns ErrObjectAlreadyExists if the key already exists.
func (r *S3Repository) UploadObject(ctx context.Context, req S3RequestContext, key string, body io.Reader, contentType string) error {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return err
	}
	return r.s3Service.UploadObject(ctx, opts, s3.UploadObjectInput{Bucket: bucket, Key: key, Body: body, ContentType: contentType})
}

// ListObjects resolves credentials from req and lists objects using options.
func (r *S3Repository) ListObjects(ctx context.Context, req S3RequestContext, options s3.ListObjectsOptions) (*s3.ListObjectsResponse, error) {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return nil, err
	}
	return r.s3Service.ListObjects(ctx, opts, s3.ListObjectsQuery{
		Bucket: bucket,
		Path:   options.Path,
		Search: options.Search,
		Next:   options.Next,
		Limit:  options.Limit,
	})
}

// ObjectExists resolves credentials from req and checks whether key exists.
func (r *S3Repository) ObjectExists(ctx context.Context, req S3RequestContext, key string) (bool, error) {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return false, err
	}
	return r.s3Service.ObjectExists(ctx, opts, s3.ObjectExistsInput{Bucket: bucket, Key: key})
}

// csvSchemaRange is the HTTP Range header used when fetching CSV data for schema inference.
// The streaming parser stops after 100 rows, so only the bytes actually read are transferred;
// this ceiling prevents runaway transfers for extremely wide rows.
const csvSchemaRange = "bytes=0-1048575" // 1 MB

// GetCSVSchema resolves credentials from req, fetches the CSV at key from S3, and
// infers its column schema. Only CSV files (key ending in .csv) are supported.
// Returns an error if the file has fewer than 100 data rows.
func (r *S3Repository) GetCSVSchema(ctx context.Context, req S3RequestContext, key string) (helper.CSVSchemaResult, error) {
	if !strings.HasSuffix(strings.ToLower(key), ".csv") {
		return helper.CSVSchemaResult{}, fmt.Errorf("%w: only CSV files are supported (must have .csv extension)", ErrCSVUploadValidation)
	}

	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return helper.CSVSchemaResult{}, err
	}

	body, _, err := r.s3Service.GetObject(ctx, opts, s3.GetObjectInput{Bucket: bucket, Key: key, Range: csvSchemaRange})
	if err != nil {
		return helper.CSVSchemaResult{}, fmt.Errorf("error retrieving CSV file from S3: %w", err)
	}
	defer body.Close()

	return helper.InferCSVSchema(body)
}

// extractAWSS3ConnectionOptions extracts S3 connection options from a Kubernetes secret's
// raw data using the AWS_* key convention used by RHOAI/ODH data connection secrets.
// Also returns the optional default bucket (AWS_S3_BUCKET) separately.
func extractAWSS3ConnectionOptions(data map[string][]byte) (s3.ConnectionOptions, string, error) {
	get := func(key string) (string, error) {
		v, err := kubernetes.LookupSecretValue(data, key)
		if err != nil {
			return "", fmt.Errorf("field %s: %w", key, err)
		}
		return v, nil
	}

	accessKeyID, err := get("AWS_ACCESS_KEY_ID")
	if err != nil {
		return s3.ConnectionOptions{}, "", err
	}
	secretAccessKey, err := get("AWS_SECRET_ACCESS_KEY")
	if err != nil {
		return s3.ConnectionOptions{}, "", err
	}
	region, err := get("AWS_DEFAULT_REGION")
	if err != nil {
		return s3.ConnectionOptions{}, "", err
	}
	endpoint, err := get("AWS_S3_ENDPOINT")
	if err != nil {
		return s3.ConnectionOptions{}, "", err
	}
	bucket, err := get("AWS_S3_BUCKET")
	if err != nil {
		return s3.ConnectionOptions{}, "", err
	}

	if accessKeyID == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: missing required field AWS_ACCESS_KEY_ID", ErrS3Configuration)
	}
	if secretAccessKey == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: missing required field AWS_SECRET_ACCESS_KEY", ErrS3Configuration)
	}
	if region == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: missing required field AWS_DEFAULT_REGION", ErrS3Configuration)
	}
	if endpoint == "" {
		return s3.ConnectionOptions{}, "", fmt.Errorf("%w: missing required field AWS_S3_ENDPOINT", ErrS3Configuration)
	}

	return s3.ConnectionOptions{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		BaseEndpoint:    endpoint,
	}, bucket, nil
}

// UploadCSVFile validates the upload is a CSV, resolves a non-colliding key, and uploads
// body to S3. It is the single repo call for the upload handler.
// maxAttempts of 0 uses the default (10).
func (r *S3Repository) UploadCSVFile(ctx context.Context, req S3RequestContext, key string, body io.Reader, rawContentType, filename string, maxAttempts int) (string, error) {
	contentType, err := ValidateCsvUpload(rawContentType, filename)
	if err != nil {
		return "", err
	}

	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return "", err
	}

	if maxAttempts <= 0 {
		maxAttempts = defaultMaxCollisionAttempts
	}

	keyCtx, cancel := context.WithTimeout(ctx, s3KeyResolutionTimeout)
	defer cancel()

	resolvedKey, err := r.s3Service.ResolveNonCollidingKey(keyCtx, opts, s3.ResolveNonCollidingKeyInput{
		Bucket:      bucket,
		Key:         key,
		MaxAttempts: maxAttempts,
	})
	if err != nil {
		return "", err
	}

	return resolvedKey, r.s3Service.UploadObject(ctx, opts, s3.UploadObjectInput{
		Bucket:      bucket,
		Key:         resolvedKey,
		Body:        body,
		ContentType: contentType,
	})
}

// ValidateCsvUpload validates that a multipart upload is a CSV file and returns "text/csv".
// contentType is the raw Content-Type header; filename is the part's filename.
// Accepts: text/csv; application/octet-stream or empty Content-Type when filename ends with .csv.
func ValidateCsvUpload(contentType, filename string) (string, error) {
	raw := strings.TrimSpace(contentType)
	fn := strings.ToLower(strings.TrimSpace(filename))

	if raw == "" {
		if strings.HasSuffix(fn, ".csv") {
			return "text/csv", nil
		}
		return "", fmt.Errorf("%w: use a .csv filename or Content-Type text/csv", ErrCSVUploadValidation)
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
		return "", fmt.Errorf("%w: application/octet-stream requires a .csv filename", ErrCSVUploadValidation)
	default:
		return "", fmt.Errorf("%w: Content-Type must be text/csv, or application/octet-stream with a .csv filename", ErrCSVUploadValidation)
	}
}

// --- Content-type policy ---

// inlineAllowedTypes are the only content types served inline on GET responses.
// All others get Content-Disposition: attachment to prevent XSS.
var inlineAllowedTypes = map[string]bool{
	"text/csv":          true,
	"application/json":  true,
}

// SanitizeResponseContentType normalizes S3 metadata on GET. Only text/csv and
// application/json are echoed; other types become application/octet-stream so
// arbitrary S3 metadata cannot set executable types under the dashboard origin.
func SanitizeResponseContentType(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "application/octet-stream"
	}
	mediaType, _, err := mime.ParseMediaType(raw)
	if err != nil {
		return "application/octet-stream"
	}
	mediaType = strings.ToLower(mediaType)
	if inlineAllowedTypes[mediaType] {
		return mediaType
	}
	return "application/octet-stream"
}

// GetObjectResult holds the result of an S3 object retrieval with content-type
// policy already applied by the repository.
type GetObjectResult struct {
	Body          io.ReadCloser
	ContentType   string
	ForceDownload bool
}
