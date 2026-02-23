package lsmocks

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"time"
)

const seedHTTPTimeout = 30 * time.Second

// SeedData populates the local Llama Stack server with test data:
// vector stores, files, and verifies model availability.
// The testID is injected via X-LlamaStack-Provider-Data header for record-replay isolation.
func SeedData(baseURL string, testID string, logger *slog.Logger) error {
	client := &http.Client{Timeout: seedHTTPTimeout}

	providerHeader := fmt.Sprintf(`{"__test_id": "%s"}`, testID)

	// 1. Verify models are available
	logger.Debug("Verifying models are available...")
	modelsResp, err := doJSONGet(client, baseURL+"/v1/models", providerHeader)
	if err != nil {
		return fmt.Errorf("failed to list models: %w", err)
	}
	data, ok := modelsResp["data"].([]interface{})
	if !ok || len(data) == 0 {
		return fmt.Errorf("no models available from Llama Stack server")
	}
	logger.Info("Models available", slog.Int("count", len(data)))

	// 2. Create a sample vector store
	logger.Debug("Creating sample vector store...")
	vsBody := map[string]interface{}{
		"name": "Test Vector Store",
	}
	vsResp, err := doJSONPost(client, baseURL+"/v1/vector_stores", vsBody, providerHeader)
	if err != nil {
		return fmt.Errorf("failed to create vector store: %w", err)
	}
	vectorStoreID, _ := vsResp["id"].(string)
	if vectorStoreID == "" {
		return fmt.Errorf("vector store creation returned empty ID")
	}
	logger.Info("Created vector store", slog.String("id", vectorStoreID))

	// 3. Upload a sample file
	logger.Debug("Uploading sample file...")
	fileContent := []byte("Artificial intelligence (AI) is the simulation of human intelligence " +
		"processes by computer systems. These processes include learning, reasoning, and self-correction. " +
		"Machine learning is a subset of AI that enables systems to learn from data without explicit programming. " +
		"Deep learning is a further subset using neural networks with many layers.")
	fileID, err := uploadFile(client, baseURL+"/v1/files", "test_document.txt", fileContent, providerHeader)
	if err != nil {
		return fmt.Errorf("failed to upload file: %w", err)
	}
	logger.Info("Uploaded file", slog.String("id", fileID))

	// 4. Add file to vector store
	logger.Debug("Adding file to vector store...")
	vsFileBody := map[string]interface{}{
		"file_id": fileID,
	}
	_, err = doJSONPost(client, fmt.Sprintf("%s/v1/vector_stores/%s/files", baseURL, vectorStoreID), vsFileBody, providerHeader)
	if err != nil {
		return fmt.Errorf("failed to add file to vector store: %w", err)
	}

	// Wait for background embedding to complete
	logger.Debug("Waiting for file embedding to complete...")
	time.Sleep(5 * time.Second)
	logger.Info("Seeded Llama Stack with test data",
		slog.String("vector_store_id", vectorStoreID),
		slog.String("file_id", fileID),
	)

	return nil
}

func doJSONGet(client *http.Client, url string, providerHeader string) (map[string]interface{}, error) {
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}
	if providerHeader != "" {
		req.Header.Set("X-LlamaStack-Provider-Data", providerHeader)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return result, nil
}

func doJSONPost(client *http.Client, url string, body interface{}, providerHeader string) (map[string]interface{}, error) {
	jsonBody, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if providerHeader != "" {
		req.Header.Set("X-LlamaStack-Provider-Data", providerHeader)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}
	return result, nil
}

func uploadFile(client *http.Client, url string, filename string, content []byte, providerHeader string) (string, error) {
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	part, err := writer.CreateFormFile("file", filename)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(content); err != nil {
		return "", err
	}

	if err := writer.WriteField("purpose", "assistants"); err != nil {
		return "", err
	}

	if err := writer.Close(); err != nil {
		return "", err
	}

	req, err := http.NewRequest("POST", url, &buf)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	if providerHeader != "" {
		req.Header.Set("X-LlamaStack-Provider-Data", providerHeader)
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(respBody))
	}

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	id, _ := result["id"].(string)
	if id == "" {
		return "", fmt.Errorf("file upload returned empty ID")
	}
	return id, nil
}
