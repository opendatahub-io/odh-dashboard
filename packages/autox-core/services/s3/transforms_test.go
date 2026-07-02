package s3

import (
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	awss3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
)

func TestMapListObjectsOutput(t *testing.T) {
	ts := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	t.Run("maps all fields", func(t *testing.T) {
		output := &awss3.ListObjectsV2Output{
			IsTruncated:           aws.Bool(true),
			KeyCount:              aws.Int32(2),
			MaxKeys:               aws.Int32(100),
			Name:                  aws.String("my-bucket"),
			Prefix:                aws.String("data/"),
			Delimiter:             aws.String("/"),
			ContinuationToken:     aws.String("tok1"),
			NextContinuationToken: aws.String("tok2"),
			CommonPrefixes: []awss3types.CommonPrefix{
				{Prefix: aws.String("data/subdir/")},
			},
			Contents: []awss3types.Object{
				{Key: aws.String("data/file.csv"), Size: aws.Int64(1024), ETag: aws.String("\"abc\""), LastModified: &ts, StorageClass: awss3types.ObjectStorageClassStandard},
			},
		}

		result := mapListObjectsOutput(output)

		if !result.IsTruncated {
			t.Error("IsTruncated should be true")
		}
		if result.KeyCount != 2 {
			t.Errorf("KeyCount = %d", result.KeyCount)
		}
		if result.Name != "my-bucket" {
			t.Errorf("Name = %q", result.Name)
		}
		if result.NextContinuationToken != "tok2" {
			t.Errorf("NextContinuationToken = %q", result.NextContinuationToken)
		}
		if len(result.CommonPrefixes) != 1 || result.CommonPrefixes[0].Prefix != "data/subdir/" {
			t.Errorf("CommonPrefixes = %v", result.CommonPrefixes)
		}
		if len(result.Contents) != 1 {
			t.Fatalf("expected 1 content, got %d", len(result.Contents))
		}
		obj := result.Contents[0]
		if obj.Key != "data/file.csv" || obj.Size != 1024 {
			t.Errorf("unexpected object: %+v", obj)
		}
	})

	t.Run("filters zero-byte folder markers", func(t *testing.T) {
		output := &awss3.ListObjectsV2Output{
			Contents: []awss3types.Object{
				{Key: aws.String("data/"), Size: aws.Int64(0)},
				{Key: aws.String("data/real-file.txt"), Size: aws.Int64(100)},
				{Key: aws.String("data/subfolder/"), Size: aws.Int64(0)},
			},
		}

		result := mapListObjectsOutput(output)

		if len(result.Contents) != 1 {
			t.Fatalf("expected 1 content (folder markers filtered), got %d", len(result.Contents))
		}
		if result.Contents[0].Key != "data/real-file.txt" {
			t.Errorf("Key = %q", result.Contents[0].Key)
		}
	})

	t.Run("keeps non-zero files ending in slash", func(t *testing.T) {
		output := &awss3.ListObjectsV2Output{
			Contents: []awss3types.Object{
				{Key: aws.String("weird-file/"), Size: aws.Int64(42)},
			},
		}

		result := mapListObjectsOutput(output)
		if len(result.Contents) != 1 {
			t.Error("non-zero file ending in / should be kept")
		}
	})

	t.Run("empty output", func(t *testing.T) {
		result := mapListObjectsOutput(&awss3.ListObjectsV2Output{})
		if len(result.Contents) != 0 || len(result.CommonPrefixes) != 0 {
			t.Error("expected empty slices")
		}
	})
}

func TestMapObjectInfo(t *testing.T) {
	ts := time.Date(2024, 6, 1, 12, 0, 0, 0, time.UTC)

	t.Run("with all fields", func(t *testing.T) {
		obj := awss3types.Object{
			Key:          aws.String("path/to/file.parquet"),
			Size:         aws.Int64(999),
			ETag:         aws.String("\"etag123\""),
			LastModified: &ts,
			StorageClass: awss3types.ObjectStorageClassStandard,
		}

		info := mapObjectInfo(obj)
		if info.Key != "path/to/file.parquet" {
			t.Errorf("Key = %q", info.Key)
		}
		if info.Size != 999 {
			t.Errorf("Size = %d", info.Size)
		}
		if info.ETag != "\"etag123\"" {
			t.Errorf("ETag = %q", info.ETag)
		}
		if info.LastModified != "2024-06-01T12:00:00Z" {
			t.Errorf("LastModified = %q", info.LastModified)
		}
		if info.StorageClass != "STANDARD" {
			t.Errorf("StorageClass = %q", info.StorageClass)
		}
	})

	t.Run("nil LastModified", func(t *testing.T) {
		info := mapObjectInfo(awss3types.Object{Key: aws.String("k")})
		if info.LastModified != "" {
			t.Errorf("expected empty LastModified, got %q", info.LastModified)
		}
	})
}

func TestMapCommonPrefix(t *testing.T) {
	cp := awss3types.CommonPrefix{Prefix: aws.String("data/subdir/")}
	result := mapCommonPrefix(cp)
	if result.Prefix != "data/subdir/" {
		t.Errorf("Prefix = %q", result.Prefix)
	}
}
