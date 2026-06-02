package s3

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"testing"
)

// mockS3Client implements Client for service tests.
type mockS3Client struct {
	getObjectFn      func(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error)
	downloadObjectFn func(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error)
	uploadObjectFn   func(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error
	listObjectsFn    func(ctx context.Context, opts ConnectionOptions, input ListObjectsInput) (*ListObjectsResponse, error)
	objectExistsFn   func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error)
}

func (m *mockS3Client) GetObject(ctx context.Context, opts ConnectionOptions, input GetObjectInput) (io.ReadCloser, string, error) {
	return m.getObjectFn(ctx, opts, input)
}
func (m *mockS3Client) DownloadObject(ctx context.Context, opts ConnectionOptions, input DownloadObjectInput) (io.ReadCloser, string, error) {
	return m.downloadObjectFn(ctx, opts, input)
}
func (m *mockS3Client) UploadObject(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error {
	return m.uploadObjectFn(ctx, opts, input)
}
func (m *mockS3Client) ListObjects(ctx context.Context, opts ConnectionOptions, input ListObjectsInput) (*ListObjectsResponse, error) {
	return m.listObjectsFn(ctx, opts, input)
}
func (m *mockS3Client) ObjectExists(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
	return m.objectExistsFn(ctx, opts, input)
}

func newTestS3Service(client *mockS3Client) *Service {
	return NewService(ServiceConfig{Logger: slog.Default()}, client)
}

// --- buildListPrefix ---

func TestBuildListPrefix(t *testing.T) {
	tests := []struct {
		name   string
		query  ListObjectsQuery
		want   string
	}{
		{"empty path and search", ListObjectsQuery{}, ""},
		{"path only", ListObjectsQuery{Path: "data"}, "data/"},
		{"path with trailing slash", ListObjectsQuery{Path: "data/"}, "data/"},
		{"search only", ListObjectsQuery{Search: "file"}, "file"},
		{"path and search", ListObjectsQuery{Path: "data", Search: "file"}, "data/file"},
		{"path with slash and search", ListObjectsQuery{Path: "data/", Search: "report"}, "data/report"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := buildListPrefix(tt.query); got != tt.want {
				t.Errorf("buildListPrefix() = %q, want %q", got, tt.want)
			}
		})
	}
}

// --- split helpers ---

func TestSplitS3ObjectPath(t *testing.T) {
	tests := []struct {
		key     string
		wantDir string
		wantName string
	}{
		{"data/models/file.tar.gz", "data/models/", "file.tar.gz"},
		{"file.txt", "", "file.txt"},
		{"a/b/c", "a/b/", "c"},
		{"trailing/", "trailing/", ""},
	}
	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			dir, name := splitS3ObjectPath(tt.key)
			if dir != tt.wantDir || name != tt.wantName {
				t.Errorf("splitS3ObjectPath(%q) = (%q, %q), want (%q, %q)", tt.key, dir, name, tt.wantDir, tt.wantName)
			}
		})
	}
}

func TestSplitNameAndExtension(t *testing.T) {
	tests := []struct {
		filename string
		wantStem string
		wantExt  string
	}{
		{"file.csv", "file", ".csv"},
		{"archive.tar.gz", "archive.tar", ".gz"},
		{"noext", "noext", ""},
		{".hidden", ".hidden", ""},
		{"", "", ""},
	}
	for _, tt := range tests {
		t.Run(tt.filename, func(t *testing.T) {
			stem, ext := splitNameAndExtension(tt.filename)
			if stem != tt.wantStem || ext != tt.wantExt {
				t.Errorf("splitNameAndExtension(%q) = (%q, %q), want (%q, %q)", tt.filename, stem, ext, tt.wantStem, tt.wantExt)
			}
		})
	}
}

func TestSplitStemAndNextIndex(t *testing.T) {
	tests := []struct {
		stem      string
		wantBase  string
		wantIndex int
	}{
		{"file", "file", 1},
		{"file-1", "file", 2},
		{"file-10", "file", 11},
		{"file-0", "file", 1},
		{"my-model-3", "my-model", 4},
		{"no-number-suffix-abc", "no-number-suffix-abc", 1},
		{"-5", "", 6},
	}
	for _, tt := range tests {
		t.Run(tt.stem, func(t *testing.T) {
			base, idx := splitStemAndNextIndex(tt.stem)
			if base != tt.wantBase || idx != tt.wantIndex {
				t.Errorf("splitStemAndNextIndex(%q) = (%q, %d), want (%q, %d)", tt.stem, base, idx, tt.wantBase, tt.wantIndex)
			}
		})
	}
}

// --- ResolveNonCollidingKey ---

func TestService_ResolveNonCollidingKey(t *testing.T) {
	t.Run("key available immediately", func(t *testing.T) {
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				return false, nil
			},
		}
		svc := newTestS3Service(client)

		key, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "data/file.csv", MaxAttempts: 5,
		})
		if err != nil {
			t.Fatal(err)
		}
		if key != "data/file.csv" {
			t.Errorf("key = %q, want original", key)
		}
	})

	t.Run("first collision resolved with suffix", func(t *testing.T) {
		call := 0
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				call++
				// First call (original key) exists, second (file-1.csv) does not
				return call == 1, nil
			},
		}
		svc := newTestS3Service(client)

		key, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "data/file.csv", MaxAttempts: 5,
		})
		if err != nil {
			t.Fatal(err)
		}
		if key != "data/file-1.csv" {
			t.Errorf("key = %q, want data/file-1.csv", key)
		}
	})

	t.Run("increments existing suffix", func(t *testing.T) {
		call := 0
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				call++
				// model-3.csv exists, model-4.csv exists, model-5.csv does not
				return call <= 2, nil
			},
		}
		svc := newTestS3Service(client)

		key, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "models/model-3.csv", MaxAttempts: 5,
		})
		if err != nil {
			t.Fatal(err)
		}
		// model-3.csv exists → stem "model-3" has trailing -3 → try model-4.csv (exists) → try model-5.csv (free)
		if key != "models/model-5.csv" {
			t.Errorf("key = %q, want models/model-5.csv", key)
		}
	})

	t.Run("max collisions exceeded", func(t *testing.T) {
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				return true, nil
			},
		}
		svc := newTestS3Service(client)

		_, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "file.txt", MaxAttempts: 3,
		})
		if !errors.Is(err, ErrMaxCollisionsExceeded) {
			t.Errorf("expected ErrMaxCollisionsExceeded, got %v", err)
		}
	})

	t.Run("no extension", func(t *testing.T) {
		call := 0
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				call++
				return call == 1, nil
			},
		}
		svc := newTestS3Service(client)

		key, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "README", MaxAttempts: 5,
		})
		if err != nil {
			t.Fatal(err)
		}
		if key != "README-1" {
			t.Errorf("key = %q, want README-1", key)
		}
	})

	t.Run("existence check error propagated", func(t *testing.T) {
		client := &mockS3Client{
			objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
				return false, fmt.Errorf("connection failed")
			},
		}
		svc := newTestS3Service(client)

		_, err := svc.ResolveNonCollidingKey(context.Background(), testOpts(), ResolveNonCollidingKeyInput{
			Bucket: "b", Key: "file.txt", MaxAttempts: 5,
		})
		if err == nil {
			t.Error("expected error")
		}
	})
}

// --- Service pass-through methods ---

func TestService_ListObjects(t *testing.T) {
	t.Run("translates query to input", func(t *testing.T) {
		var gotInput ListObjectsInput
		client := &mockS3Client{
			listObjectsFn: func(ctx context.Context, opts ConnectionOptions, input ListObjectsInput) (*ListObjectsResponse, error) {
				gotInput = input
				return &ListObjectsResponse{KeyCount: 1}, nil
			},
		}
		svc := newTestS3Service(client)

		_, err := svc.ListObjects(context.Background(), testOpts(), ListObjectsQuery{
			Bucket: "my-bucket", Path: "data", Search: "file", Limit: 50, Next: "tok",
		})
		if err != nil {
			t.Fatal(err)
		}
		if gotInput.Bucket != "my-bucket" {
			t.Errorf("Bucket = %q", gotInput.Bucket)
		}
		if gotInput.Prefix != "data/file" {
			t.Errorf("Prefix = %q, want data/file", gotInput.Prefix)
		}
		if gotInput.Delimiter != "/" {
			t.Errorf("Delimiter = %q", gotInput.Delimiter)
		}
		if gotInput.Limit != 50 {
			t.Errorf("Limit = %d", gotInput.Limit)
		}
		if gotInput.ContinuationToken != "tok" {
			t.Errorf("ContinuationToken = %q", gotInput.ContinuationToken)
		}
	})
}

func TestService_ObjectExists(t *testing.T) {
	client := &mockS3Client{
		objectExistsFn: func(ctx context.Context, opts ConnectionOptions, input ObjectExistsInput) (bool, error) {
			return input.Key == "exists", nil
		},
	}
	svc := newTestS3Service(client)

	exists, err := svc.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "exists"})
	if err != nil {
		t.Fatal(err)
	}
	if !exists {
		t.Error("expected true")
	}

	exists, err = svc.ObjectExists(context.Background(), testOpts(), ObjectExistsInput{Bucket: "b", Key: "missing"})
	if err != nil {
		t.Fatal(err)
	}
	if exists {
		t.Error("expected false")
	}
}

func TestService_UploadObject(t *testing.T) {
	t.Run("success", func(t *testing.T) {
		client := &mockS3Client{
			uploadObjectFn: func(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error {
				return nil
			},
		}
		svc := newTestS3Service(client)

		err := svc.UploadObject(context.Background(), testOpts(), UploadObjectInput{
			Bucket: "b", Key: "k", Body: strings.NewReader("data"), ContentType: "text/plain",
		})
		if err != nil {
			t.Fatal(err)
		}
	})

	t.Run("already exists", func(t *testing.T) {
		client := &mockS3Client{
			uploadObjectFn: func(ctx context.Context, opts ConnectionOptions, input UploadObjectInput) error {
				return ErrObjectAlreadyExists
			},
		}
		svc := newTestS3Service(client)

		err := svc.UploadObject(context.Background(), testOpts(), UploadObjectInput{
			Bucket: "b", Key: "k", Body: strings.NewReader("data"),
		})
		if !errors.Is(err, ErrObjectAlreadyExists) {
			t.Errorf("expected ErrObjectAlreadyExists, got %v", err)
		}
	})
}
