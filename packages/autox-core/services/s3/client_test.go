package s3

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"testing"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/s3/transfermanager"
	awss3 "github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// --- Mock implementations ---

type mockAPIClient struct {
	headObjectFn    func(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error)
	listObjectsV2Fn func(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error)
	getObjectFn     func(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error)
}

func (m *mockAPIClient) HeadObject(ctx context.Context, params *awss3.HeadObjectInput, optFns ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
	return m.headObjectFn(ctx, params, optFns...)
}
func (m *mockAPIClient) ListObjectsV2(ctx context.Context, params *awss3.ListObjectsV2Input, optFns ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error) {
	return m.listObjectsV2Fn(ctx, params, optFns...)
}
func (m *mockAPIClient) GetObject(ctx context.Context, params *awss3.GetObjectInput, optFns ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
	return m.getObjectFn(ctx, params, optFns...)
}

type mockTransferClient struct {
	uploadObjectFn func(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error)
	getObjectFn    func(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error)
}

func (m *mockTransferClient) UploadObject(ctx context.Context, params *transfermanager.UploadObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
	return m.uploadObjectFn(ctx, params, optFns...)
}
func (m *mockTransferClient) GetObject(ctx context.Context, params *transfermanager.GetObjectInput, optFns ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
	return m.getObjectFn(ctx, params, optFns...)
}

type mockProvider struct {
	apiClient      APIClient
	transferClient TransferClient
	apiErr         error
	transferErr    error
}

func (m *mockProvider) CreateAPIClient(opts ConnectionOptions) (APIClient, error) {
	return m.apiClient, m.apiErr
}
func (m *mockProvider) CreateTransferClient(opts ConnectionOptions) (TransferClient, error) {
	return m.transferClient, m.transferErr
}

func testOpts() ConnectionOptions {
	return ConnectionOptions{AccessKeyID: "AK", SecretAccessKey: "SK", Region: "us-east-1", BaseEndpoint: "https://s3.example.com"}
}

// --- GetObject ---

func TestClient_GetObject(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		api := &mockAPIClient{
			getObjectFn: func(ctx context.Context, params *awss3.GetObjectInput, _ ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
				if aws.ToString(params.Bucket) != "b" || aws.ToString(params.Key) != "k" {
					t.Errorf("unexpected params: bucket=%q key=%q", aws.ToString(params.Bucket), aws.ToString(params.Key))
				}
				return &awss3.GetObjectOutput{
					Body:        io.NopCloser(strings.NewReader("content")),
					ContentType: aws.String("text/csv"),
				}, nil
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		body, ct, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "k"})
		if err != nil {
			t.Fatal(err)
		}
		defer body.Close()

		if ct != "text/csv" {
			t.Errorf("content type = %q", ct)
		}
		data, _ := io.ReadAll(body)
		if string(data) != "content" {
			t.Errorf("body = %q", string(data))
		}
	})

	t.Run("range header passed", func(t *testing.T) {
		var gotRange string
		api := &mockAPIClient{
			getObjectFn: func(ctx context.Context, params *awss3.GetObjectInput, _ ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
				gotRange = aws.ToString(params.Range)
				return &awss3.GetObjectOutput{Body: io.NopCloser(strings.NewReader(""))}, nil
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		_, _, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "k", Range: "bytes=0-1023"})
		if err != nil {
			t.Fatal(err)
		}
		if gotRange != "bytes=0-1023" {
			t.Errorf("Range = %q", gotRange)
		}
	})

	t.Run("not found translated", func(t *testing.T) {
		api := &mockAPIClient{
			getObjectFn: func(ctx context.Context, params *awss3.GetObjectInput, _ ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
				return nil, &types.NoSuchKey{}
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		_, _, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "missing"})
		if !errors.Is(err, ErrObjectNotFound) {
			t.Errorf("expected ErrObjectNotFound, got %v", err)
		}
	})

	t.Run("default content type", func(t *testing.T) {
		api := &mockAPIClient{
			getObjectFn: func(ctx context.Context, params *awss3.GetObjectInput, _ ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
				return &awss3.GetObjectOutput{Body: io.NopCloser(strings.NewReader(""))}, nil
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		_, ct, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "k"})
		if err != nil {
			t.Fatal(err)
		}
		if ct != "application/octet-stream" {
			t.Errorf("content type = %q, want application/octet-stream", ct)
		}
	})

	t.Run("provider error", func(t *testing.T) {
		c := &client{Provider: &mockProvider{apiErr: fmt.Errorf("provider failed")}}
		_, _, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "k"})
		if err == nil {
			t.Error("expected error")
		}
	})
}

// --- DownloadObject ---

func TestClient_DownloadObject(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		tc := &mockTransferClient{
			getObjectFn: func(ctx context.Context, params *transfermanager.GetObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
				return &transfermanager.GetObjectOutput{
					Body:        io.NopCloser(strings.NewReader("big-content")),
					ContentType: aws.String("application/parquet"),
				}, nil
			},
		}
		c := &client{Provider: &mockProvider{transferClient: tc}}

		body, ct, err := c.DownloadObject(context.Background(), testOpts(), DownloadObjectInput{Bucket: "b", Key: "k"})
		if err != nil {
			t.Fatal(err)
		}
		defer body.Close()

		if ct != "application/parquet" {
			t.Errorf("content type = %q", ct)
		}
	})

	t.Run("not found translated", func(t *testing.T) {
		tc := &mockTransferClient{
			getObjectFn: func(ctx context.Context, params *transfermanager.GetObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
				return nil, &types.NoSuchKey{}
			},
		}
		c := &client{Provider: &mockProvider{transferClient: tc}}

		_, _, err := c.DownloadObject(context.Background(), testOpts(), DownloadObjectInput{Bucket: "b", Key: "missing"})
		if !errors.Is(err, ErrObjectNotFound) {
			t.Errorf("expected ErrObjectNotFound, got %v", err)
		}
	})
}

// --- UploadObject ---

func TestClient_UploadObject(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		tc := &mockTransferClient{
			uploadObjectFn: func(ctx context.Context, params *transfermanager.UploadObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
				if aws.ToString(params.IfNoneMatch) != "*" {
					t.Error("expected If-None-Match: * for conditional create")
				}
				return &transfermanager.UploadObjectOutput{}, nil
			},
		}
		c := &client{Provider: &mockProvider{transferClient: tc}}

		err := c.UploadObject(context.Background(), testOpts(), UploadObjectInput{
			Bucket: "b", Key: "k", Body: bytes.NewReader([]byte("data")), ContentType: "text/plain",
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("conditional create conflict", func(t *testing.T) {
		tc := &mockTransferClient{
			uploadObjectFn: func(ctx context.Context, params *transfermanager.UploadObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
				return nil, &s3CodedError{code: "PreconditionFailed"}
			},
		}
		c := &client{Provider: &mockProvider{transferClient: tc}}

		err := c.UploadObject(context.Background(), testOpts(), UploadObjectInput{Bucket: "b", Key: "k", Body: bytes.NewReader(nil)})
		if !errors.Is(err, ErrObjectAlreadyExists) {
			t.Errorf("expected ErrObjectAlreadyExists, got %v", err)
		}
	})

	t.Run("ConditionalRequestConflict", func(t *testing.T) {
		tc := &mockTransferClient{
			uploadObjectFn: func(ctx context.Context, params *transfermanager.UploadObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
				return nil, &s3CodedError{code: "ConditionalRequestConflict"}
			},
		}
		c := &client{Provider: &mockProvider{transferClient: tc}}

		err := c.UploadObject(context.Background(), testOpts(), UploadObjectInput{Bucket: "b", Key: "k", Body: bytes.NewReader(nil)})
		if !errors.Is(err, ErrObjectAlreadyExists) {
			t.Errorf("expected ErrObjectAlreadyExists, got %v", err)
		}
	})
}

// --- ListObjects ---

func TestClient_ListObjects(t *testing.T) {
	api := &mockAPIClient{
		listObjectsV2Fn: func(ctx context.Context, params *awss3.ListObjectsV2Input, _ ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error) {
			if aws.ToString(params.Prefix) != "data/" {
				t.Errorf("Prefix = %q", aws.ToString(params.Prefix))
			}
			if aws.ToString(params.Delimiter) != "/" {
				t.Errorf("Delimiter = %q", aws.ToString(params.Delimiter))
			}
			return &awss3.ListObjectsV2Output{
				KeyCount: aws.Int32(1),
				Contents: []types.Object{
					{Key: aws.String("data/file.csv"), Size: aws.Int64(100)},
				},
			}, nil
		},
	}
	c := &client{Provider: &mockProvider{apiClient: api}}

	resp, err := c.ListObjects(context.Background(), testOpts(), ListObjectsInput{
		Bucket: "b", Prefix: "data/", Delimiter: "/", Limit: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(resp.Contents) != 1 {
		t.Errorf("expected 1 content, got %d", len(resp.Contents))
	}
}

// --- ObjectExists ---

func TestClient_ObjectExists(t *testing.T) {
	t.Run("exists", func(t *testing.T) {
		api := &mockAPIClient{
			headObjectFn: func(ctx context.Context, params *awss3.HeadObjectInput, _ ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
				return &awss3.HeadObjectOutput{}, nil
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		exists, err := c.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "k"})
		if err != nil {
			t.Fatal(err)
		}
		if !exists {
			t.Error("expected true")
		}
	})

	t.Run("not found returns false", func(t *testing.T) {
		api := &mockAPIClient{
			headObjectFn: func(ctx context.Context, params *awss3.HeadObjectInput, _ ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
				return nil, &types.NotFound{}
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		exists, err := c.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "missing"})
		if err != nil {
			t.Fatal(err)
		}
		if exists {
			t.Error("expected false for not found")
		}
	})

	t.Run("access denied propagated", func(t *testing.T) {
		api := &mockAPIClient{
			headObjectFn: func(ctx context.Context, params *awss3.HeadObjectInput, _ ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
				return nil, &s3CodedError{code: "AccessDenied"}
			},
		}
		c := &client{Provider: &mockProvider{apiClient: api}}

		_, err := c.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "k"})
		if !errors.Is(err, ErrAccessDenied) {
			t.Errorf("expected ErrAccessDenied, got %v", err)
		}
	})
}

// --- translateS3Error ---

func TestTranslateS3Error(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want error
	}{
		{"NoSuchKey type", &types.NoSuchKey{}, ErrObjectNotFound},
		{"NotFound type", &types.NotFound{}, ErrObjectNotFound},
		{"NoSuchBucket type", &types.NoSuchBucket{}, ErrBucketNotFound},
		{"NotFound code", &s3CodedError{code: "NotFound"}, ErrObjectNotFound},
		{"NoSuchKey code", &s3CodedError{code: "NoSuchKey"}, ErrObjectNotFound},
		{"404 code", &s3CodedError{code: "404"}, ErrObjectNotFound},
		{"NoSuchBucket code", &s3CodedError{code: "NoSuchBucket"}, ErrBucketNotFound},
		{"AccessDenied code", &s3CodedError{code: "AccessDenied"}, ErrAccessDenied},
		{"unknown returns nil", fmt.Errorf("random"), nil},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := translateS3Error(tt.err)
			if !errors.Is(got, tt.want) {
				t.Errorf("translateS3Error() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsS3ConditionalCreateConflict(t *testing.T) {
	if !isS3ConditionalCreateConflict(&s3CodedError{code: "PreconditionFailed"}) {
		t.Error("expected true for PreconditionFailed")
	}
	if !isS3ConditionalCreateConflict(&s3CodedError{code: "ConditionalRequestConflict"}) {
		t.Error("expected true for ConditionalRequestConflict")
	}
	if isS3ConditionalCreateConflict(&s3CodedError{code: "AccessDenied"}) {
		t.Error("expected false for AccessDenied")
	}
	if isS3ConditionalCreateConflict(fmt.Errorf("plain error")) {
		t.Error("expected false for plain error")
	}
}

// --- Client untranslated error paths ---

func TestClient_GetObject_UntranslatedError(t *testing.T) {
	api := &mockAPIClient{
		getObjectFn: func(ctx context.Context, params *awss3.GetObjectInput, _ ...func(*awss3.Options)) (*awss3.GetObjectOutput, error) {
			return nil, fmt.Errorf("generic AWS error")
		},
	}
	c := &client{Provider: &mockProvider{apiClient: api}}

	_, _, err := c.GetObject(context.Background(), testOpts(), GetObjectInput{Bucket: "b", Key: "k"})
	if err == nil {
		t.Error("expected error")
	}
	if !strings.Contains(err.Error(), "error retrieving object") {
		t.Errorf("expected wrapped error, got: %v", err)
	}
}

func TestClient_DownloadObject_UntranslatedError(t *testing.T) {
	tc := &mockTransferClient{
		getObjectFn: func(ctx context.Context, params *transfermanager.GetObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
			return nil, fmt.Errorf("generic download error")
		},
	}
	c := &client{Provider: &mockProvider{transferClient: tc}}

	_, _, err := c.DownloadObject(context.Background(), testOpts(), DownloadObjectInput{Bucket: "b", Key: "k"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_DownloadObject_NonReadCloserBody(t *testing.T) {
	tc := &mockTransferClient{
		getObjectFn: func(ctx context.Context, params *transfermanager.GetObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.GetObjectOutput, error) {
			return &transfermanager.GetObjectOutput{
				Body:        strings.NewReader("plain-reader"),
				ContentType: aws.String("text/plain"),
			}, nil
		},
	}
	c := &client{Provider: &mockProvider{transferClient: tc}}

	body, _, err := c.DownloadObject(context.Background(), testOpts(), DownloadObjectInput{Bucket: "b", Key: "k"})
	if err != nil {
		t.Fatal(err)
	}
	defer body.Close()
	data, _ := io.ReadAll(body)
	if string(data) != "plain-reader" {
		t.Errorf("body = %q", string(data))
	}
}

func TestClient_UploadObject_UntranslatedError(t *testing.T) {
	tc := &mockTransferClient{
		uploadObjectFn: func(ctx context.Context, params *transfermanager.UploadObjectInput, _ ...func(*transfermanager.Options)) (*transfermanager.UploadObjectOutput, error) {
			return nil, fmt.Errorf("generic upload error")
		},
	}
	c := &client{Provider: &mockProvider{transferClient: tc}}

	err := c.UploadObject(context.Background(), testOpts(), UploadObjectInput{Bucket: "b", Key: "k", Body: bytes.NewReader(nil)})
	if err == nil {
		t.Error("expected error")
	}
	if !strings.Contains(err.Error(), "error uploading object") {
		t.Errorf("expected wrapped error, got: %v", err)
	}
}

func TestClient_ListObjects_UntranslatedError(t *testing.T) {
	api := &mockAPIClient{
		listObjectsV2Fn: func(ctx context.Context, params *awss3.ListObjectsV2Input, _ ...func(*awss3.Options)) (*awss3.ListObjectsV2Output, error) {
			return nil, fmt.Errorf("generic list error")
		},
	}
	c := &client{Provider: &mockProvider{apiClient: api}}

	_, err := c.ListObjects(context.Background(), testOpts(), ListObjectsInput{Bucket: "b", Prefix: "/", Delimiter: "/"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_ObjectExists_UntranslatedError(t *testing.T) {
	api := &mockAPIClient{
		headObjectFn: func(ctx context.Context, params *awss3.HeadObjectInput, _ ...func(*awss3.Options)) (*awss3.HeadObjectOutput, error) {
			return nil, fmt.Errorf("generic head error")
		},
	}
	c := &client{Provider: &mockProvider{apiClient: api}}

	_, err := c.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "k"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_UploadObject_ProviderError(t *testing.T) {
	c := &client{Provider: &mockProvider{transferErr: fmt.Errorf("provider failed")}}
	err := c.UploadObject(context.Background(), testOpts(), UploadObjectInput{Bucket: "b", Key: "k", Body: bytes.NewReader(nil)})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_DownloadObject_ProviderError(t *testing.T) {
	c := &client{Provider: &mockProvider{transferErr: fmt.Errorf("provider failed")}}
	_, _, err := c.DownloadObject(context.Background(), testOpts(), DownloadObjectInput{Bucket: "b", Key: "k"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_ListObjects_ProviderError(t *testing.T) {
	c := &client{Provider: &mockProvider{apiErr: fmt.Errorf("provider failed")}}
	_, err := c.ListObjects(context.Background(), testOpts(), ListObjectsInput{Bucket: "b"})
	if err == nil {
		t.Error("expected error")
	}
}

func TestClient_ObjectExists_ProviderError(t *testing.T) {
	c := &client{Provider: &mockProvider{apiErr: fmt.Errorf("provider failed")}}
	_, err := c.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "k"})
	if err == nil {
		t.Error("expected error")
	}
}

// --- ClientConfig.withDefaults ---

func TestClientConfigWithDefaults(t *testing.T) {
	cfg := ClientConfig{}.withDefaults()
	if cfg.Concurrency != defaultTransferConcurrency {
		t.Errorf("Concurrency = %d", cfg.Concurrency)
	}
	if cfg.PartSizeBytes != defaultTransferPartSizeBytes {
		t.Errorf("PartSizeBytes = %d", cfg.PartSizeBytes)
	}
	if cfg.GetObjectBufSize != defaultTransferGetObjectBufSize {
		t.Errorf("GetObjectBufSize = %d", cfg.GetObjectBufSize)
	}
	if cfg.PartBodyMaxRetries != defaultTransferPartMaxRetries {
		t.Errorf("PartBodyMaxRetries = %d", cfg.PartBodyMaxRetries)
	}

	custom := ClientConfig{Concurrency: 10, PartSizeBytes: 1}.withDefaults()
	if custom.Concurrency != 10 {
		t.Error("should preserve explicit Concurrency")
	}
	if custom.PartSizeBytes != 1 {
		t.Error("should preserve explicit PartSizeBytes")
	}
}

// --- test helpers ---

// s3CodedError implements the ErrorCode() interface used by translateS3Error.
type s3CodedError struct {
	code string
}

func (e *s3CodedError) Error() string     { return "s3 error: " + e.code }
func (e *s3CodedError) ErrorCode() string { return e.code }

