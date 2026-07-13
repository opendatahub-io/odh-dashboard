package api

import (
	"bytes"
	"context"
	"io"
	"strings"
	"testing"

	s3int "github.com/opendatahub-io/automl-library/bff/internal/integrations/s3"
	"github.com/opendatahub-io/automl-library/bff/internal/integrations/s3/s3mocks"
	"github.com/opendatahub-io/automl-library/bff/internal/repositories"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestReadTrainingCSV_WithinLimit(t *testing.T) {
	t.Parallel()

	data, err := readTrainingCSV(strings.NewReader("col\n1\n"))
	require.NoError(t, err)
	assert.Equal(t, []byte("col\n1\n"), data)
}

func TestReadTrainingCSV_ExceedsLimit(t *testing.T) {
	t.Parallel()

	oversized := bytes.Repeat([]byte("a"), int(s3MaxUploadFileBytes)+1)
	_, err := readTrainingCSV(bytes.NewReader(oversized))
	require.Error(t, err)

	var validationErr *repositories.ValidationError
	require.ErrorAs(t, err, &validationErr)
	assert.Equal(t, s3FilePartTooLargeMsg, validationErr.Error())
}

func TestReadTrainingCSV_ReadError(t *testing.T) {
	t.Parallel()

	_, err := readTrainingCSV(io.NopCloser(errReader{err: io.ErrUnexpectedEOF}))
	require.Error(t, err)
	assert.Contains(t, err.Error(), "failed to read training data CSV")
}

type errReader struct {
	err error
}

func (e errReader) Read([]byte) (int, error) {
	return 0, e.err
}

func TestUploadASCIICompatibleTrainingCSV_VerifiesExistingObject(t *testing.T) {
	t.Parallel()

	rewritten := []byte("alias,feature\n1,2\n")
	key := repositories.DeriveASCIICompatibleCSVKey("data/train.csv", rewritten)
	client := &storedS3Client{objects: map[string][]byte{key: rewritten}}

	require.NoError(t, uploadASCIICompatibleTrainingCSV(context.Background(), client, "bucket", key, rewritten))
}

func TestUploadASCIICompatibleTrainingCSV_RejectsMismatchedExistingObject(t *testing.T) {
	t.Parallel()

	rewritten := []byte("alias,feature\n1,2\n")
	key := repositories.DeriveASCIICompatibleCSVKey("data/train.csv", rewritten)
	client := &storedS3Client{objects: map[string][]byte{key: []byte("different,content\n")}}

	err := uploadASCIICompatibleTrainingCSV(context.Background(), client, "bucket", key, rewritten)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "does not match expected rewritten CSV")
}

type storedS3Client struct {
	s3mocks.MockS3Client
	objects map[string][]byte
}

func (c *storedS3Client) UploadObject(_ context.Context, _ string, key string, body io.Reader, _ string) error {
	if _, exists := c.objects[key]; exists {
		return s3int.ErrObjectAlreadyExists
	}
	data, err := io.ReadAll(body)
	if err != nil {
		return err
	}
	c.objects[key] = data
	return nil
}

func (c *storedS3Client) GetObject(_ context.Context, _, key string) (io.ReadCloser, string, error) {
	data, ok := c.objects[key]
	if !ok {
		return c.MockS3Client.GetObject(context.Background(), "", key)
	}
	return io.NopCloser(bytes.NewReader(data)), "text/csv", nil
}
