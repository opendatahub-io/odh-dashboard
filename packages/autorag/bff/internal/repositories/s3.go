package repositories

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"strings"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
	k8s "github.com/opendatahub-io/autorag-library/bff/internal/integrations/kubernetes"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
	Bucket          string // Optional bucket name from secret (AWS_S3_BUCKET)
}

type S3Repository struct{}

func NewS3Repository() *S3Repository {
	return &S3Repository{}
}

// GetS3Credentials retrieves S3 credentials from a Kubernetes secret
func (r *S3Repository) GetS3Credentials(
	client k8s.KubernetesClientInterface,
	ctx context.Context,
	namespace string,
	secretName string,
	identity *k8s.RequestIdentity,
) (*S3Credentials, error) {
	// Fetch the specific secret
	secret, err := client.GetSecret(ctx, namespace, secretName, identity)
	if err != nil {
		return nil, fmt.Errorf("error fetching secret '%s' from namespace %s: %w", secretName, namespace, err)
	}

	// Extract S3 credentials from secret data (case-insensitive key matching)
	creds := &S3Credentials{}
	secretData := secret.Data

	// Helper to get value from secret data case-insensitively
	getValue := func(targetKeys ...string) string {
		// Check all keys in the secret against the target keys (case-insensitive)
		for secretKey, secretValue := range secretData {
			secretKeyLower := strings.ToLower(secretKey)
			for _, targetKey := range targetKeys {
				if secretKeyLower == strings.ToLower(targetKey) {
					return string(secretValue)
				}
			}
		}
		return ""
	}

	creds.AccessKeyID = getValue("AWS_ACCESS_KEY_ID")
	creds.SecretAccessKey = getValue("AWS_SECRET_ACCESS_KEY")
	creds.Region = getValue("AWS_DEFAULT_REGION")
	creds.EndpointURL = getValue("AWS_S3_ENDPOINT")
	creds.Bucket = getValue("AWS_S3_BUCKET") // Optional bucket name

	// Validate that all required fields are present
	if creds.AccessKeyID == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_ACCESS_KEY_ID", secretName)
	}
	if creds.SecretAccessKey == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_SECRET_ACCESS_KEY", secretName)
	}
	if creds.Region == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_DEFAULT_REGION", secretName)
	}
	if creds.EndpointURL == "" {
		return nil, fmt.Errorf("secret '%s' missing required field: AWS_S3_ENDPOINT", secretName)
	}

	return creds, nil
}

// GetS3Object retrieves an object from S3 using transfer manager for optimized downloading
// and returns a reader for the content. Uses concurrent multipart downloads for large files.
func (r *S3Repository) GetS3Object(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (io.Reader, string, error) {
	// Create AWS config with credentials
	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	// Create S3 client
	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(creds.EndpointURL)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	// Create transfer manager for optimized downloads
	transferClient := transfermanager.New(s3Client)

	// Get the object using transfer manager
	// This automatically handles multipart downloads for large files with concurrency
	result, err := transferClient.GetObject(ctx, &transfermanager.GetObjectInput{
		Bucket: aws.String(bucket),
		Key:    aws.String(key),
	}, func(o *transfermanager.Options) {
		// Configure for optimal streaming performance
		o.Concurrency = 10                  // 10 concurrent part downloads
		o.PartSizeBytes = 64 * 1024 * 1024  // 64MB parts for large files
		o.GetObjectBufferSize = 1024 * 1024 // 1MB buffer for streaming
		o.PartBodyMaxRetries = 3            // Retry failed parts up to 3 times
		o.DisableChecksumValidation = false // Enable checksum validation for data integrity
	})
	if err != nil {
		return nil, "", fmt.Errorf("error retrieving object from S3: %w", err)
	}

	// Get content type, default to application/octet-stream if not specified
	contentType := "application/octet-stream"
	if result.ContentType != nil {
		contentType = *result.ContentType
	}

	// Transfer manager's GetObject returns io.Reader; caller should type-assert to io.Closer if cleanup is needed
	return result.Body, contentType, nil
}

type GetS3ObjectsOptions struct {
	Path   string // Denotes the current "folder" we should be searching in
	Search string // The value the user entered into the search bar
	Next   string // The token value to use if the user wants the next page
	Limit  int32  // Variable amount of max keys so we can paginate
}

// S3ObjectInfo represents a single S3 object in the listing response.
type S3ObjectInfo struct {
	Key          string `json:"Key"`
	LastModified string `json:"LastModified,omitempty"`
	ETag         string `json:"ETag,omitempty"`
	Size         int64  `json:"Size"`
	StorageClass string `json:"StorageClass,omitempty"`
}

// S3CommonPrefix represents a common prefix (virtual folder) in the listing response.
type S3CommonPrefix struct {
	Prefix string `json:"Prefix"`
}

// S3ListObjectsResponse is the BFF's own response type for S3 list operations,
// decoupled from the AWS SDK's ListObjectsV2Output.
type S3ListObjectsResponse struct {
	CommonPrefixes        []S3CommonPrefix `json:"CommonPrefixes,omitempty"`
	Contents              []S3ObjectInfo   `json:"Contents,omitempty"`
	ContinuationToken     string           `json:"ContinuationToken,omitempty"`
	Delimiter             string           `json:"Delimiter,omitempty"`
	IsTruncated           bool             `json:"IsTruncated"`
	KeyCount              int32            `json:"KeyCount"`
	MaxKeys               int32            `json:"MaxKeys"`
	Name                  string           `json:"Name,omitempty"`
	NextContinuationToken string           `json:"NextContinuationToken,omitempty"`
	Prefix                string           `json:"Prefix,omitempty"`
}

// GetS3Objects retrieves objects from S3
func (r *S3Repository) GetS3Objects(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	options GetS3ObjectsOptions,
) (*S3ListObjectsResponse, error) {
	// TODO [Gustavo] This function currently handles the FileExplorer case where path,search,page are passed in explicitly. Additional case to cover in the future: List all and find by regex for table where resource powers AutoRAG leaderboard

	cfg := aws.Config{
		Region:      creds.Region,
		Credentials: credentials.NewStaticCredentialsProvider(creds.AccessKeyID, creds.SecretAccessKey, ""),
	}

	s3Client := s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = aws.String(creds.EndpointURL)
		// Enable path-style addressing for S3-compatible services like MinIO
		o.UsePathStyle = true
	})

	prefix := options.Search
	if options.Path != "" {
		if !strings.HasSuffix(options.Path, "/") {
			options.Path += "/"
		}
		prefix = options.Path + options.Search
	}

	input := &s3.ListObjectsV2Input{
		Bucket:    aws.String(bucket),
		Delimiter: aws.String("/"),
		Prefix:    aws.String(prefix),
		MaxKeys:   aws.Int32(options.Limit),
	}

	if options.Next != "" {
		input.ContinuationToken = aws.String(options.Next)
	}

	output, err := s3Client.ListObjectsV2(ctx, input)
	if err != nil {
		var noBucket *types.NoSuchBucket
		if errors.As(err, &noBucket) {
			log.Printf("Bucket %s does not exist.\n", bucket)
			err = noBucket
		}
		return nil, err
	}

	// Map SDK output to our own response type
	result := &S3ListObjectsResponse{
		IsTruncated: *output.IsTruncated,
		KeyCount:    *output.KeyCount,
		MaxKeys:     *output.MaxKeys,
	}

	if output.Name != nil {
		result.Name = *output.Name
	}
	if output.Prefix != nil {
		result.Prefix = *output.Prefix
	}
	if output.Delimiter != nil {
		result.Delimiter = *output.Delimiter
	}
	if output.ContinuationToken != nil {
		result.ContinuationToken = *output.ContinuationToken
	}
	if output.NextContinuationToken != nil {
		result.NextContinuationToken = *output.NextContinuationToken
	}

	for _, cp := range output.CommonPrefixes {
		prefix := ""
		if cp.Prefix != nil {
			prefix = *cp.Prefix
		}
		result.CommonPrefixes = append(result.CommonPrefixes, S3CommonPrefix{Prefix: prefix})
	}

	for _, obj := range output.Contents {
		info := S3ObjectInfo{
			Size: aws.ToInt64(obj.Size),
		}
		if obj.Key != nil {
			info.Key = *obj.Key
		}
		if obj.LastModified != nil {
			info.LastModified = obj.LastModified.Format("2006-01-02T15:04:05Z")
		}
		if obj.ETag != nil {
			info.ETag = *obj.ETag
		}
		if obj.StorageClass != "" {
			info.StorageClass = string(obj.StorageClass)
		}
		result.Contents = append(result.Contents, info)
	}

	return result, nil
}
