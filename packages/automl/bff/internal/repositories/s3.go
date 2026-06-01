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
	corek8s "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/kubernetes"
	corepipelines "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/pipelines"
	cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// s3MetadataTimeout caps the total time for key-existence checks during collision resolution.
const s3KeyResolutionTimeout = 15 * time.Second

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
	s3Service        *cores3.Service
	k8sService       *corek8s.Service
	pipelinesService *corepipelines.Service
}

func NewS3Repository(
	s3Service *cores3.Service,
	k8sService *corek8s.Service,
	pipelinesService *corepipelines.Service,
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
func (r *S3Repository) resolveCredsAndBucket(ctx context.Context, req S3RequestContext) (cores3.ConnectionOptions, string, error) {
	if req.SecretName != "" {
		return r.resolveFromSecret(ctx, req)
	}
	return r.resolveFromDSPA(ctx, req.Namespace)
}

func (r *S3Repository) resolveFromSecret(ctx context.Context, req S3RequestContext) (cores3.ConnectionOptions, string, error) {
	secret, err := r.k8sService.GetSecret(ctx, req.Namespace, req.SecretName)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("error fetching secret %q from namespace %s: %w", req.SecretName, req.Namespace, err)
	}

	opts, defaultBucket, err := extractAWSS3ConnectionOptions(secret.Data)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("secret %q: %w", req.SecretName, err)
	}

	bucket := strings.TrimSpace(req.Bucket)
	if bucket == "" {
		bucket = defaultBucket
	}
	if bucket == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("bucket is required: supply ?bucket= or set AWS_S3_BUCKET in secret %q", req.SecretName)
	}

	return opts, bucket, nil
}

func (r *S3Repository) resolveFromDSPA(ctx context.Context, namespace string) (cores3.ConnectionOptions, string, error) {
	dspa, err := r.pipelinesService.DiscoverReadyDSPA(ctx, namespace)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("failed to discover DSPA in namespace %s: %w", namespace, err)
	}

	spec := dspa.ObjectStorage
	if spec == nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA %q in namespace %s has no object storage configured", dspa.Name, namespace)
	}
	if spec.SecretName == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA %q object storage spec is missing a secret name", dspa.Name)
	}
	if spec.EndpointURL == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA %q object storage spec is missing an endpoint URL", dspa.Name)
	}
	if spec.Bucket == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA %q object storage spec is missing a bucket — contact your administrator", dspa.Name)
	}

	secret, err := r.k8sService.GetSecret(ctx, namespace, spec.SecretName)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("error fetching DSPA secret %q from namespace %s: %w", spec.SecretName, namespace, err)
	}

	accessKeyID, err := corek8s.LookupSecretValue(secret.Data, spec.AccessKeyField)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q: %w", spec.SecretName, err)
	}
	if accessKeyID == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q missing required field: %s", spec.SecretName, spec.AccessKeyField)
	}

	secretAccessKey, err := corek8s.LookupSecretValue(secret.Data, spec.SecretKeyField)
	if err != nil {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q: %w", spec.SecretName, err)
	}
	if secretAccessKey == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("DSPA secret %q missing required field: %s", spec.SecretName, spec.SecretKeyField)
	}

	region := spec.Region
	if region == "" {
		region = "us-east-1"
	}

	// Endpoint and bucket from spec are the authority for DSPA paths.
	// Secret overrides (AWS_S3_ENDPOINT, AWS_S3_BUCKET) follow the DSPA operator
	// convention for MinIO-style secrets and take precedence when present.
	endpointURL := spec.EndpointURL
	if secretEndpoint, lErr := corek8s.LookupSecretValue(secret.Data, "AWS_S3_ENDPOINT"); lErr != nil {
		slog.Warn("ignoring ambiguous AWS_S3_ENDPOINT in DSPA secret, using spec value",
			"secret", spec.SecretName, "error", lErr)
	} else if secretEndpoint != "" {
		endpointURL = secretEndpoint
	}

	bucket := spec.Bucket
	if secretBucket, lErr := corek8s.LookupSecretValue(secret.Data, "AWS_S3_BUCKET"); lErr != nil {
		slog.Warn("ignoring ambiguous AWS_S3_BUCKET in DSPA secret, using spec value",
			"secret", spec.SecretName, "error", lErr)
	} else if secretBucket != "" {
		bucket = secretBucket
	}

	return cores3.ConnectionOptions{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		BaseEndpoint:    endpointURL,
	}, bucket, nil
}

// GetObject resolves credentials from req and retrieves the object at key.
// The caller is responsible for closing the returned body.
func (r *S3Repository) GetObject(ctx context.Context, req S3RequestContext, key string) (io.ReadCloser, string, error) {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return nil, "", err
	}
	return r.s3Service.DownloadObject(ctx, opts, cores3.DownloadObjectInput{Bucket: bucket, Key: key})
}

// UploadObject resolves credentials from req and uploads body at key.
// Returns ErrObjectAlreadyExists if the key already exists.
func (r *S3Repository) UploadObject(ctx context.Context, req S3RequestContext, key string, body io.Reader, contentType string) error {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return err
	}
	return r.s3Service.UploadObject(ctx, opts, cores3.UploadObjectInput{Bucket: bucket, Key: key, Body: body, ContentType: contentType})
}

// ListObjects resolves credentials from req and lists objects using options.
func (r *S3Repository) ListObjects(ctx context.Context, req S3RequestContext, options cores3.ListObjectsOptions) (*cores3.ListObjectsResponse, error) {
	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return nil, err
	}
	return r.s3Service.ListObjects(ctx, opts, cores3.ListObjectsQuery{
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
	return r.s3Service.ObjectExists(ctx, opts, cores3.ObjectExistsInput{Bucket: bucket, Key: key})
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
		return helper.CSVSchemaResult{}, fmt.Errorf("only CSV files are supported (must have .csv extension)")
	}

	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return helper.CSVSchemaResult{}, err
	}

	body, _, err := r.s3Service.GetObject(ctx, opts, cores3.GetObjectInput{Bucket: bucket, Key: key, Range: csvSchemaRange})
	if err != nil {
		return helper.CSVSchemaResult{}, fmt.Errorf("error retrieving CSV file from S3: %w", err)
	}
	defer body.Close()

	return helper.InferCSVSchema(body)
}

// extractAWSS3ConnectionOptions extracts S3 connection options from a Kubernetes secret's
// raw data using the AWS_* key convention used by RHOAI/ODH data connection secrets.
// Also returns the optional default bucket (AWS_S3_BUCKET) separately.
func extractAWSS3ConnectionOptions(data map[string][]byte) (cores3.ConnectionOptions, string, error) {
	get := func(key string) (string, error) {
		v, err := corek8s.LookupSecretValue(data, key)
		if err != nil {
			return "", fmt.Errorf("field %s: %w", key, err)
		}
		return v, nil
	}

	accessKeyID, err := get("AWS_ACCESS_KEY_ID")
	if err != nil {
		return cores3.ConnectionOptions{}, "", err
	}
	secretAccessKey, err := get("AWS_SECRET_ACCESS_KEY")
	if err != nil {
		return cores3.ConnectionOptions{}, "", err
	}
	region, err := get("AWS_DEFAULT_REGION")
	if err != nil {
		return cores3.ConnectionOptions{}, "", err
	}
	endpoint, err := get("AWS_S3_ENDPOINT")
	if err != nil {
		return cores3.ConnectionOptions{}, "", err
	}
	bucket, err := get("AWS_S3_BUCKET")
	if err != nil {
		return cores3.ConnectionOptions{}, "", err
	}

	if accessKeyID == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("secret missing required field: AWS_ACCESS_KEY_ID")
	}
	if secretAccessKey == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("secret missing required field: AWS_SECRET_ACCESS_KEY")
	}
	if region == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("secret missing required field: AWS_DEFAULT_REGION")
	}
	if endpoint == "" {
		return cores3.ConnectionOptions{}, "", fmt.Errorf("secret missing required field: AWS_S3_ENDPOINT")
	}

	return cores3.ConnectionOptions{
		AccessKeyID:     accessKeyID,
		SecretAccessKey: secretAccessKey,
		Region:          region,
		BaseEndpoint:    endpoint,
	}, bucket, nil
}

// UploadCSVFile validates the upload is a CSV, resolves a non-colliding key, and uploads
// body to S3. It is the single repo call for the upload handler.
func (r *S3Repository) UploadCSVFile(ctx context.Context, req S3RequestContext, key string, body io.Reader, rawContentType, filename string, maxAttempts int) (string, error) {
	contentType, err := ValidateCsvUpload(rawContentType, filename)
	if err != nil {
		return "", err
	}

	opts, bucket, err := r.resolveCredsAndBucket(ctx, req)
	if err != nil {
		return "", err
	}

	keyCtx, cancel := context.WithTimeout(ctx, s3KeyResolutionTimeout)
	defer cancel()

	resolvedKey, err := r.s3Service.ResolveNonCollidingKey(keyCtx, opts, cores3.ResolveNonCollidingKeyInput{
		Bucket:      bucket,
		Key:         key,
		MaxAttempts: maxAttempts,
	})
	if err != nil {
		return "", err
	}

	return resolvedKey, r.s3Service.UploadObject(ctx, opts, cores3.UploadObjectInput{
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
