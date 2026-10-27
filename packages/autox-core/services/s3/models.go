package s3

import (
	"errors"
	"fmt"
	"io"
	"strings"

	transfertypes "github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager/types"
)

// ChecksumAlgorithmSecretKey selects a checksum algorithm for S3 uploads.
const ChecksumAlgorithmSecretKey = "AWS_S3_UPLOAD_CHECKSUM_ALGORITHM"

// DisableUploadChecksumTrailersSecretKey disables optional streaming checksum
// trailers for S3 uploads when set to true.
const DisableUploadChecksumTrailersSecretKey = "AWS_S3_DISABLE_UPLOAD_CHECKSUM_TRAILERS"

// ChecksumAlgorithm is the checksum algorithm accepted by the AWS S3 transfer manager.
type ChecksumAlgorithm = transfertypes.ChecksumAlgorithm

// ParseChecksumAlgorithm validates and normalizes a transfer manager checksum algorithm.
// An empty value keeps the SDK default checksum behavior for backwards compatibility.
func ParseChecksumAlgorithm(value string) (ChecksumAlgorithm, error) {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "":
		return "", nil
	case string(transfertypes.ChecksumAlgorithmCrc32):
		return transfertypes.ChecksumAlgorithmCrc32, nil
	case string(transfertypes.ChecksumAlgorithmCrc32c):
		return transfertypes.ChecksumAlgorithmCrc32c, nil
	case string(transfertypes.ChecksumAlgorithmSha1):
		return transfertypes.ChecksumAlgorithmSha1, nil
	case string(transfertypes.ChecksumAlgorithmSha256):
		return transfertypes.ChecksumAlgorithmSha256, nil
	case string(transfertypes.ChecksumAlgorithmSha512):
		return transfertypes.ChecksumAlgorithmSha512, nil
	default:
		return "", errors.New("unsupported S3 upload checksum algorithm (supported: CRC32, CRC32C, SHA1, SHA256, SHA512)")
	}
}

// ParseDisableUploadChecksumTrailers parses the opt-out setting for optional
// streaming checksum trailers. An empty value preserves the SDK default.
func ParseDisableUploadChecksumTrailers(value string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "":
		return false, nil
	case "true":
		return true, nil
	case "false":
		return false, nil
	default:
		return false, errors.New("must be true or false")
	}
}

// ParseUploadChecksumOptions parses the optional upload checksum settings from
// their Secret values. Disabling optional checksum trailers and selecting an
// explicit checksum algorithm are mutually exclusive.
func ParseUploadChecksumOptions(algorithmValue, disableTrailersValue string) (ChecksumAlgorithm, bool, error) {
	algorithm, err := ParseChecksumAlgorithm(algorithmValue)
	if err != nil {
		return "", false, fmt.Errorf("field %s: %w", ChecksumAlgorithmSecretKey, err)
	}

	disableTrailers, err := ParseDisableUploadChecksumTrailers(disableTrailersValue)
	if err != nil {
		return "", false, fmt.Errorf("field %s: %w", DisableUploadChecksumTrailersSecretKey, err)
	}
	if disableTrailers && algorithm != "" {
		return "", false, fmt.Errorf("field %s cannot be combined with field %s", DisableUploadChecksumTrailersSecretKey, ChecksumAlgorithmSecretKey)
	}

	return algorithm, disableTrailers, nil
}

// ObjectInfo represents a single S3 object in the listing response.
type ObjectInfo struct {
	Key          string `json:"key"`
	LastModified string `json:"last_modified,omitempty"`
	ETag         string `json:"etag,omitempty"`
	Size         int64  `json:"size"`
	StorageClass string `json:"storage_class,omitempty"`
}

// CommonPrefix represents a common prefix (virtual folder) in the listing response.
type CommonPrefix struct {
	Prefix string `json:"prefix"`
}

// ListObjectsResponse is the service's response type for S3 list operations,
// decoupled from the AWS SDK's ListObjectsV2Output.
type ListObjectsResponse struct {
	CommonPrefixes        []CommonPrefix `json:"common_prefixes"`
	Contents              []ObjectInfo   `json:"contents"`
	ContinuationToken     string         `json:"continuation_token,omitempty"`
	Delimiter             string         `json:"delimiter,omitempty"`
	IsTruncated           bool           `json:"is_truncated"`
	KeyCount              int32          `json:"key_count"`
	MaxKeys               int32          `json:"max_keys"`
	Name                  string         `json:"name,omitempty"`
	NextContinuationToken string         `json:"next_continuation_token,omitempty"`
	Prefix                string         `json:"prefix,omitempty"`
}

// ListObjectsOptions contains the listing parameters used at the repository boundary,
// where the bucket has not yet been resolved from credentials.
type ListObjectsOptions struct {
	Path   string // Virtual prefix / "folder" to list within
	Search string // Substring filter appended to the prefix
	Next   string // Continuation token for pagination
	Limit  int32  // Maximum number of keys per page
}

// --- Operation input types ---

// GetObjectInput holds the parameters for a GetObject operation.
type GetObjectInput struct {
	Bucket string
	Key    string
	// Range is an optional HTTP range header value (e.g. "bytes=0-1048575").
	// When set, the raw S3 SDK client is used instead of the transfer manager,
	// returning exactly the requested byte range in a single HTTP round trip.
	Range string
}

// DownloadObjectInput holds the parameters for a DownloadObject operation
// using the transfer manager (concurrent multipart download for large files).
type DownloadObjectInput struct {
	Bucket string
	Key    string
}

// UploadObjectInput holds the parameters for an UploadObject operation.
type UploadObjectInput struct {
	Bucket      string
	Key         string
	Body        io.Reader
	ContentType string
}

// ObjectExistsInput holds the parameters for an ObjectExists operation.
type ObjectExistsInput struct {
	Bucket string
	Key    string
}

// ListObjectsQuery holds the service-level parameters for a ListObjects operation.
// Path and Search are business-level browsing concepts; Service translates them
// into a raw S3 Prefix before calling Client.
type ListObjectsQuery struct {
	Bucket string
	Path   string // virtual prefix / "folder" to list within
	Search string // substring filter appended to the prefix
	Next   string // continuation token for pagination
	Limit  int32  // maximum number of keys per page
}

// ListObjectsInput holds the raw S3 protocol parameters for a ListObjects operation.
// Used by Client; callers of Service should use ListObjectsQuery instead.
type ListObjectsInput struct {
	Bucket            string
	Prefix            string
	Delimiter         string
	Limit             int32
	ContinuationToken string
}

// ResolveNonCollidingKeyInput holds the parameters for a ResolveNonCollidingKey operation.
type ResolveNonCollidingKeyInput struct {
	Bucket      string
	Key         string
	MaxAttempts int
}
