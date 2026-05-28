package s3

import (
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	awss3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// --- Unexported transforms (AWS SDK → domain models, used by client.go) ---

func mapListObjectsOutput(output *awss3.ListObjectsV2Output) *S3ListObjectsResponse {
	result := &S3ListObjectsResponse{
		IsTruncated:           aws.ToBool(output.IsTruncated),
		KeyCount:              aws.ToInt32(output.KeyCount),
		MaxKeys:               aws.ToInt32(output.MaxKeys),
		Name:                  aws.ToString(output.Name),
		Prefix:                aws.ToString(output.Prefix),
		Delimiter:             aws.ToString(output.Delimiter),
		ContinuationToken:     aws.ToString(output.ContinuationToken),
		NextContinuationToken: aws.ToString(output.NextContinuationToken),
		CommonPrefixes:        make([]S3CommonPrefix, 0, len(output.CommonPrefixes)),
		Contents:              make([]S3ObjectInfo, 0, len(output.Contents)),
	}

	for _, cp := range output.CommonPrefixes {
		result.CommonPrefixes = append(result.CommonPrefixes, mapCommonPrefix(cp))
	}
	for _, obj := range output.Contents {
		// Skip zero-byte folder markers (keys ending in "/" with size 0).
		// S3 uses these as placeholders for "folders" — they are not real files
		// and cause the UI to render the current folder as a child of itself.
		if strings.HasSuffix(aws.ToString(obj.Key), "/") && aws.ToInt64(obj.Size) == 0 {
			continue
		}
		result.Contents = append(result.Contents, mapObjectInfo(obj))
	}

	return result
}

func mapObjectInfo(obj awss3types.Object) S3ObjectInfo {
	info := S3ObjectInfo{
		Key:          aws.ToString(obj.Key),
		Size:         aws.ToInt64(obj.Size),
		ETag:         aws.ToString(obj.ETag),
		StorageClass: string(obj.StorageClass),
	}
	if obj.LastModified != nil {
		info.LastModified = obj.LastModified.Format(time.RFC3339)
	}
	return info
}

func mapCommonPrefix(cp awss3types.CommonPrefix) S3CommonPrefix {
	return S3CommonPrefix{Prefix: aws.ToString(cp.Prefix)}
}
