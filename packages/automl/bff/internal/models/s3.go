package models

import cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"

// S3ObjectInfo, S3CommonPrefix, and S3ListObjectsResponse are type aliases for
// the canonical types in autox-core. Existing handler code that imports models
// continues to compile without changes.
type S3ObjectInfo = cores3.S3ObjectInfo
type S3CommonPrefix = cores3.S3CommonPrefix
type S3ListObjectsResponse = cores3.S3ListObjectsResponse
