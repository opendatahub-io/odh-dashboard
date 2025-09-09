package api

import (
	"bytes"
	"encoding/json"
	"io"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/opendatahub-io/gen-ai/internal/config"
	"github.com/opendatahub-io/gen-ai/internal/integrations/llamastack/lsmocks"
	"github.com/opendatahub-io/gen-ai/internal/repositories"
	"github.com/stretchr/testify/assert"
)

func TestLlamaStackUploadFileHandler(t *testing.T) {
	// Create test app with mock client
	app := App{
		config: config.EnvConfig{
			Port: 4000,
		},
		repositories: repositories.NewRepositories(lsmocks.NewMockLlamaStackClient()),
	}

	// Helper function to create multipart request
	createMultipartRequest := func(filename, content, vectorStoreID, purpose, chunkingType string) (*http.Request, error) {
		var err error
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)

		// Add file
		if filename != "" {
			fileWriter, err := writer.CreateFormFile("file", filename)
			if err != nil {
				return nil, err
			}
			_, err = fileWriter.Write([]byte(content))
			if err != nil {
				return nil, err
			}
		}

		// Add form fields
		if vectorStoreID != "" {
			err = writer.WriteField("vector_store_id", vectorStoreID)
			if err != nil {
				return nil, err
			}
		}
		if purpose != "" {
			err = writer.WriteField("purpose", purpose)
			if err != nil {
				return nil, err
			}
		}
		if chunkingType != "" {
			err = writer.WriteField("chunking_type", chunkingType)
			if err != nil {
				return nil, err
			}
		}

		writer.Close()

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload", &body)
		if err != nil {
			return nil, err
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())
		return req, nil
	}

	t.Run("should upload file successfully with required parameters", func(t *testing.T) {
		req, err := createMultipartRequest("test.txt", "Test file content", "vs_test123", "", "")
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Verify mock response structure
		assert.Contains(t, data, "file_id")
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
		assert.Contains(t, data, "vector_store_file")
	})

	t.Run("should upload file with optional parameters", func(t *testing.T) {
		req, err := createMultipartRequest("test.txt", "Test file content", "vs_test123", "assistants", "auto")
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["file_id"])

		// Verify vector store file details
		vectorStoreFile := data["vector_store_file"].(map[string]interface{})
		assert.Equal(t, "vs_test123", vectorStoreFile["vector_store_id"])
		assert.Equal(t, "completed", vectorStoreFile["status"])
	})

	t.Run("should return error when file is missing", func(t *testing.T) {
		req, err := createMultipartRequest("", "", "vs_test123", "", "")
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "file is required")
	})

	t.Run("should return error when vector_store_id is missing", func(t *testing.T) {
		req, err := createMultipartRequest("test.txt", "Test content", "", "", "")
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusBadRequest, rr.Code)

		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		errorObj := response["error"].(map[string]interface{})
		assert.Contains(t, errorObj["message"], "vector_store_id is required")
	})

	t.Run("should use unified repository pattern", func(t *testing.T) {
		assert.NotNil(t, app.repositories)
		assert.NotNil(t, app.repositories.Files)

		req, err := createMultipartRequest("test.txt", "Test content", "vs_test123", "assistants", "")
		assert.NoError(t, err)

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		// Verify response structure matches FileUploadResult
		var response map[string]interface{}
		body, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		err = json.Unmarshal(body, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})

		// Should have FileUploadResult structure
		assert.Contains(t, data, "file_id")
		assert.Contains(t, data, "vector_store_file")

		// Verify mock file ID
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
	})

	t.Run("should handle static chunking parameters", func(t *testing.T) {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)

		fileWriter, err := writer.CreateFormFile("file", "test.txt")
		assert.NoError(t, err)
		_, err = fileWriter.Write([]byte("Test content"))
		assert.NoError(t, err)

		err = writer.WriteField("vector_store_id", "vs_test123")
		assert.NoError(t, err)
		err = writer.WriteField("chunking_type", "static")
		assert.NoError(t, err)
		err = writer.WriteField("max_chunk_size_tokens", "512")
		assert.NoError(t, err)
		err = writer.WriteField("chunk_overlap_tokens", "50")
		assert.NoError(t, err)
		writer.Close()

		req, err := http.NewRequest(http.MethodPost, "/gen-ai/api/v1/files/upload", &body)
		assert.NoError(t, err)
		req.Header.Set("Content-Type", writer.FormDataContentType())

		rr := httptest.NewRecorder()
		app.LlamaStackUploadFileHandler(rr, req, nil)

		assert.Equal(t, http.StatusCreated, rr.Code)

		responseBody, err := io.ReadAll(rr.Result().Body)
		assert.NoError(t, err)
		defer rr.Result().Body.Close()

		var response map[string]interface{}
		err = json.Unmarshal(responseBody, &response)
		assert.NoError(t, err)

		// Verify envelope structure
		assert.Contains(t, response, "data")
		data := response["data"].(map[string]interface{})
		assert.Equal(t, "file-mock123abc456def", data["file_id"])
	})
}
