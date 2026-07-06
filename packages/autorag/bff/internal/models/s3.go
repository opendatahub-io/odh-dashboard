package models

// S3ObjectInfo represents a single S3 object in the listing response.
type S3ObjectInfo struct {
	Key          string `json:"key"`
	LastModified string `json:"last_modified,omitempty"`
	ETag         string `json:"etag,omitempty"`
	Size         int64  `json:"size"`
	StorageClass string `json:"storage_class,omitempty"`
}

// S3CommonPrefix represents a common prefix (virtual folder) in the listing response.
type S3CommonPrefix struct {
	Prefix string `json:"prefix"`
}

// S3ListObjectsResponse is the BFF's own response type for S3 list operations,
// decoupled from the AWS SDK's ListObjectsV2Output.
type S3ListObjectsResponse struct {
	CommonPrefixes        []S3CommonPrefix `json:"common_prefixes"`
	Contents              []S3ObjectInfo   `json:"contents"`
	ContinuationToken     string           `json:"continuation_token,omitempty"`
	Delimiter             string           `json:"delimiter,omitempty"`
	IsTruncated           bool             `json:"is_truncated"`
	KeyCount              int32            `json:"key_count"`
	MaxKeys               int32            `json:"max_keys"`
	Name                  string           `json:"name,omitempty"`
	NextContinuationToken string           `json:"next_continuation_token,omitempty"`
	Prefix                string           `json:"prefix,omitempty"`
}
