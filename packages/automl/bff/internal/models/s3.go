package models

import cores3 "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"

// ObjectInfo, CommonPrefix, and ListObjectsResponse are type aliases for
// the canonical types in autox-core. Existing handler code that imports models
// continues to compile without changes.
type ObjectInfo = cores3.ObjectInfo
type CommonPrefix = cores3.CommonPrefix
type ListObjectsResponse = cores3.ListObjectsResponse
