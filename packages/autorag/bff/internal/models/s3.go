package models

// TODO [ PR-Feedback: AI ] A2 - Gustavo:
//   JSON tags use PascalCase ("Key", "CommonPrefixes") while the rest of the BFF models use
//   snake_case ("run_id", "display_name"). This creates an inconsistent API surface for frontend
//   consumers. Since these are BFF-owned types (decoupled from AWS SDK), consider aligning with
//   the project convention: "key", "last_modified", "common_prefixes", etc.
//   This will require updating the OpenAPI spec, contract tests, and mock client accordingly.

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
	CommonPrefixes        []S3CommonPrefix `json:"CommonPrefixes"`
	Contents              []S3ObjectInfo   `json:"Contents"`
	ContinuationToken     string           `json:"ContinuationToken,omitempty"`
	Delimiter             string           `json:"Delimiter,omitempty"`
	IsTruncated           bool             `json:"IsTruncated"`
	KeyCount              int32            `json:"KeyCount"`
	MaxKeys               int32            `json:"MaxKeys"`
	Name                  string           `json:"Name,omitempty"`
	NextContinuationToken string           `json:"NextContinuationToken,omitempty"`
	Prefix                string           `json:"Prefix,omitempty"`
}
