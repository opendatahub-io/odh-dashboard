package repositories

import (
	"context"
	"errors"
	"log"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3Credentials contains the credentials needed to connect to S3
type S3Credentials struct {
	AccessKeyID     string
	SecretAccessKey string
	Region          string
	EndpointURL     string
}

type BucketBasics struct {
	S3Client *s3.Client
}

type S3Repository struct{}

// GetS3Objects retrieves objects from S3
func (r *S3Repository) GetS3Objects(
	ctx context.Context,
	creds *S3Credentials,
	bucket string,
	key string,
) (string, error) {
	// TODO [Gustavo] Match signature to upload func in other PR
	return "", nil
}

// ListObjects lists the objects in a bucket.
func (basics BucketBasics) ListObjects(ctx context.Context, bucketName string) ([]types.Object, error) {
	var err error
	var output *s3.ListObjectsV2Output
	input := &s3.ListObjectsV2Input{
		Bucket: aws.String(bucketName),
	}
	// TODO [Gustavo] This snippet from AWS S3 SDK docs works well to get them all, but our func needs to just show 1 page at a time with 1,000 default max page size
	var objects []types.Object
	objectPaginator := s3.NewListObjectsV2Paginator(basics.S3Client, input)
	for objectPaginator.HasMorePages() {
		output, err = objectPaginator.NextPage(ctx)
		if err != nil {
			var noBucket *types.NoSuchBucket
			if errors.As(err, &noBucket) {
				log.Printf("Bucket %s does not exist.\n", bucketName)
				err = noBucket
			}
			break
		} else {
			objects = append(objects, output.Contents...)
		}
	}
	return objects, err
}
