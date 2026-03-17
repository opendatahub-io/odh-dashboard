package models

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
