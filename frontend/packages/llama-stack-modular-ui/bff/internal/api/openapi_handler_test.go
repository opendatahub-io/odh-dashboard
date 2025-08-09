package api

import (
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"

	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
	"github.com/opendatahub-io/llama-stack-modular-ui/internal/config"
	"gopkg.in/yaml.v3"
)

// setupTempOpenAPISpec creates a temporary directory with the OpenAPI spec files
// Returns: specPath, tempRoot, error
func setupTempOpenAPISpec() (string, string, error) {
	// Create a temporary directory
	tempDir, err := os.MkdirTemp("", "openapi-test-*")
	if err != nil {
		return "", "", err
	}

	// Create the openapi/src directory structure
	specDir := filepath.Join(tempDir, "openapi", "src")
	if err := os.MkdirAll(specDir, 0755); err != nil {
		return "", "", err
	}

	// Create the lib subdirectory
	libDir := filepath.Join(specDir, "lib")
	if err := os.MkdirAll(libDir, 0755); err != nil {
		return "", "", err
	}

	// Get the current working directory to find the source files
	currentWd, err := os.Getwd()
	if err != nil {
		return "", "", err
	}

	// The current working directory should already be the bff root
	// where the actual openapi files are located
	bffRoot := currentWd

	// Copy the main spec file
	mainSpecSrc := filepath.Join(bffRoot, "openapi", "src", "llama-stack-modular-ui.yaml")
	mainSpecDst := filepath.Join(specDir, "llama-stack-modular-ui.yaml")
	if err := copyFile(mainSpecSrc, mainSpecDst); err != nil {
		return "", "", err
	}

	// Copy the common.yaml file
	commonSrc := filepath.Join(bffRoot, "openapi", "src", "lib", "common.yaml")
	commonDst := filepath.Join(libDir, "common.yaml")
	if err := copyFile(commonSrc, commonDst); err != nil {
		return "", "", err
	}

	return filepath.Join(specDir, "llama-stack-modular-ui.yaml"), tempDir, nil
}

// copyFile copies a file from src to dst
func copyFile(src, dst string) error {
	srcFile, err := os.Open(src)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	dstFile, err := os.Create(dst)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	_, err = io.Copy(dstFile, srcFile)
	return err
}

var _ = Describe("OpenAPI Handler", func() {
	var (
		originalWd string
	)

	BeforeEach(func() {
		// Save and change working directory for OpenAPI file access
		var err error
		originalWd, err = os.Getwd()
		Expect(err).NotTo(HaveOccurred())

		projectRoot := filepath.Join(originalWd, "..", "..")
		err = os.Chdir(projectRoot)
		Expect(err).NotTo(HaveOccurred())
	})

	AfterEach(func() {
		// Restore original working directory
		if originalWd != "" {
			err := os.Chdir(originalWd)
			Expect(err).NotTo(HaveOccurred())
		}
	})

	Describe("APIPathPrefix variations", func() {
		Context("with default /api/v1 prefix", func() {
			It("should serve OpenAPI JSON with default paths", func() {
				resp := MakeRequest(TestRequest{
					Method: "GET",
					Path:   "/openapi.json",
				})
				defer resp.Body.Close()

				Expect(resp.StatusCode).To(Equal(http.StatusOK))
				Expect(resp.Header.Get("Content-Type")).To(Equal("application/json"))

				var openAPISpec map[string]interface{}
				ReadJSONResponse(resp, &openAPISpec)

				// Verify that paths contain the default /api/v1 prefix
				paths, ok := openAPISpec["paths"].(map[string]interface{})
				Expect(ok).To(BeTrue())

				// Check that default /api/v1 paths are present
				_, hasConfigPath := paths["/api/v1/config"]
				_, hasModelsPath := paths["/api/v1/models"]
				Expect(hasConfigPath).To(BeTrue(), "Should contain /api/v1/config path")
				Expect(hasModelsPath).To(BeTrue(), "Should contain /api/v1/models path")
			})

			It("should serve OpenAPI YAML with default paths", func() {
				resp := MakeRequest(TestRequest{
					Method: "GET",
					Path:   "/openapi.yaml",
				})
				defer resp.Body.Close()

				Expect(resp.StatusCode).To(Equal(http.StatusOK))
				Expect(resp.Header.Get("Content-Type")).To(Equal("text/yaml"))

				body := ReadResponseBody(resp)
				yamlContent := string(body)

				// Verify that YAML contains the default /api/v1 prefix
				Expect(yamlContent).To(ContainSubstring("/api/v1/config"))
				Expect(yamlContent).To(ContainSubstring("/api/v1/models"))
			})
		})

		Context("with custom /rag/api/v1 prefix", func() {
			var (
				customTestCtx *SharedTestContext
			)

			BeforeEach(func() {
				// Create a separate test context with custom API path prefix
				cfg := config.EnvConfig{
					Port:          8081,
					APIPathPrefix: "/rag/api/v1",
					AuthMethod:    config.AuthMethodDisabled,
					MockLSClient:  true,
				}

				app, err := NewApp(cfg, testCtx.Logger)
				Expect(err).NotTo(HaveOccurred())

				server := testCtx.Server
				customTestCtx = &SharedTestContext{
					App:        app,
					Server:     server,
					HTTPClient: testCtx.HTTPClient,
					BaseURL:    testCtx.BaseURL,
					Logger:     testCtx.Logger,
				}
			})

			It("should serve OpenAPI JSON with custom path prefix", func() {
				// Make request directly to the custom app's handler
				req := TestRequest{
					Method: "GET",
					Path:   "/openapi.json",
				}

				// Create HTTP request
				httpReq, err := http.NewRequest(req.Method, testCtx.BaseURL+req.Path, nil)
				Expect(err).NotTo(HaveOccurred())

				// Use the custom app's routes handler directly
				recorder := &responseRecorder{
					header: make(http.Header),
					body:   make([]byte, 0),
				}

				customTestCtx.App.Routes().ServeHTTP(recorder, httpReq)

				Expect(recorder.statusCode).To(Equal(http.StatusOK))
				Expect(recorder.Header().Get("Content-Type")).To(Equal("application/json"))

				var openAPISpec map[string]interface{}
				err = json.Unmarshal(recorder.body, &openAPISpec)
				Expect(err).NotTo(HaveOccurred())

				// Verify that paths contain the custom /rag/api/v1 prefix
				paths, ok := openAPISpec["paths"].(map[string]interface{})
				Expect(ok).To(BeTrue())

				// Check that custom prefix paths are present
				_, hasConfigPath := paths["/rag/api/v1/config"]
				_, hasModelsPath := paths["/rag/api/v1/models"]
				_, hasVectorDBsPath := paths["/rag/api/v1/vector-dbs"]
				_, hasUploadPath := paths["/rag/api/v1/upload"]
				_, hasQueryPath := paths["/rag/api/v1/query"]

				Expect(hasConfigPath).To(BeTrue(), "Should contain /rag/api/v1/config path")
				Expect(hasModelsPath).To(BeTrue(), "Should contain /rag/api/v1/models path")
				Expect(hasVectorDBsPath).To(BeTrue(), "Should contain /rag/api/v1/vector-dbs path")
				Expect(hasUploadPath).To(BeTrue(), "Should contain /rag/api/v1/upload path")
				Expect(hasQueryPath).To(BeTrue(), "Should contain /rag/api/v1/query path")

				// Verify that old /api/v1 paths are NOT present
				_, hasOldConfigPath := paths["/api/v1/config"]
				_, hasOldModelsPath := paths["/api/v1/models"]
				Expect(hasOldConfigPath).To(BeFalse(), "Should not contain old /api/v1/config path")
				Expect(hasOldModelsPath).To(BeFalse(), "Should not contain old /api/v1/models path")
			})

			It("should serve OpenAPI YAML with custom path prefix", func() {
				// Make request directly to the custom app's handler
				req := TestRequest{
					Method: "GET",
					Path:   "/openapi.yaml",
				}

				// Create HTTP request
				httpReq, err := http.NewRequest(req.Method, testCtx.BaseURL+req.Path, nil)
				Expect(err).NotTo(HaveOccurred())

				// Use the custom app's routes handler directly
				recorder := &responseRecorder{
					header: make(http.Header),
					body:   make([]byte, 0),
				}

				customTestCtx.App.Routes().ServeHTTP(recorder, httpReq)

				Expect(recorder.statusCode).To(Equal(http.StatusOK))
				Expect(recorder.Header().Get("Content-Type")).To(Equal("text/yaml"))

				yamlContent := string(recorder.body)

				// Verify that YAML contains the custom /rag/api/v1 prefix
				Expect(yamlContent).To(ContainSubstring("/rag/api/v1/config"))
				Expect(yamlContent).To(ContainSubstring("/rag/api/v1/models"))
				Expect(yamlContent).To(ContainSubstring("/rag/api/v1/vector-dbs"))
				Expect(yamlContent).To(ContainSubstring("/rag/api/v1/upload"))
				Expect(yamlContent).To(ContainSubstring("/rag/api/v1/query"))

				// Verify that old /api/v1 paths are NOT present as YAML keys
				// (there might be references in comments or descriptions, but not as actual paths)
				Expect(yamlContent).NotTo(MatchRegexp(`(?m)^\s*/api/v1/config:`))
				Expect(yamlContent).NotTo(MatchRegexp(`(?m)^\s*/api/v1/models:`))
			})
		})

		Context("with another custom prefix /custom/api/v2", func() {
			var (
				customTestCtx *SharedTestContext
			)

			BeforeEach(func() {
				// Create a separate test context with another custom API path prefix
				cfg := config.EnvConfig{
					Port:          8082,
					APIPathPrefix: "/custom/api/v2",
					AuthMethod:    config.AuthMethodDisabled,
					MockLSClient:  true,
				}

				app, err := NewApp(cfg, testCtx.Logger)
				Expect(err).NotTo(HaveOccurred())

				customTestCtx = &SharedTestContext{
					App:        app,
					Server:     testCtx.Server,
					HTTPClient: testCtx.HTTPClient,
					BaseURL:    testCtx.BaseURL,
					Logger:     testCtx.Logger,
				}
			})

			It("should serve OpenAPI JSON with /custom/api/v2 prefix", func() {
				// Make request directly to the custom app's handler
				req := TestRequest{
					Method: "GET",
					Path:   "/openapi.json",
				}

				// Create HTTP request
				httpReq, err := http.NewRequest(req.Method, testCtx.BaseURL+req.Path, nil)
				Expect(err).NotTo(HaveOccurred())

				// Use the custom app's routes handler directly
				recorder := &responseRecorder{
					header: make(http.Header),
					body:   make([]byte, 0),
				}

				customTestCtx.App.Routes().ServeHTTP(recorder, httpReq)

				Expect(recorder.statusCode).To(Equal(http.StatusOK))

				var openAPISpec map[string]interface{}
				err = json.Unmarshal(recorder.body, &openAPISpec)
				Expect(err).NotTo(HaveOccurred())

				// Verify that paths contain the custom /custom/api/v2 prefix
				paths, ok := openAPISpec["paths"].(map[string]interface{})
				Expect(ok).To(BeTrue())

				// Check that custom prefix paths are present
				_, hasConfigPath := paths["/custom/api/v2/config"]
				_, hasModelsPath := paths["/custom/api/v2/models"]
				Expect(hasConfigPath).To(BeTrue(), "Should contain /custom/api/v2/config path")
				Expect(hasModelsPath).To(BeTrue(), "Should contain /custom/api/v2/models path")

				// Verify that old /api/v1 paths are NOT present
				_, hasOldConfigPath := paths["/api/v1/config"]
				Expect(hasOldConfigPath).To(BeFalse(), "Should not contain old /api/v1/config path")
			})
		})
	})

	Describe("OpenAPI redirect endpoint", func() {
		It("should redirect to Swagger UI", func() {
			// Create a custom client that doesn't follow redirects
			client := &http.Client{
				CheckRedirect: func(req *http.Request, via []*http.Request) error {
					return http.ErrUseLastResponse
				},
			}

			url := testCtx.BaseURL + "/openapi"
			req, err := http.NewRequest("GET", url, nil)
			Expect(err).NotTo(HaveOccurred())

			resp, err := client.Do(req)
			Expect(err).NotTo(HaveOccurred())
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusMovedPermanently))
			Expect(resp.Header.Get("Location")).To(Equal("/swagger-ui"))
		})
	})

	Describe("Swagger UI endpoint", func() {
		It("should serve Swagger UI HTML", func() {
			resp := MakeRequest(TestRequest{
				Method: "GET",
				Path:   "/swagger-ui",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))
			Expect(resp.Header.Get("Content-Type")).To(Equal("text/html"))

			body := ReadResponseBody(resp)
			htmlContent := string(body)

			// Verify it's Swagger UI HTML
			Expect(htmlContent).To(ContainSubstring("Llama Stack Modular UI API Documentation"))
			Expect(htmlContent).To(ContainSubstring("swagger-ui"))
		})
	})

	Describe("CORS and OPTIONS handling", func() {
		It("should handle OPTIONS request for OpenAPI JSON", func() {
			resp := MakeRequest(TestRequest{
				Method: "OPTIONS",
				Path:   "/openapi.json",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			// Verify CORS headers are present and correct
			Expect(resp.Header.Get("Access-Control-Allow-Origin")).To(Equal("*"))
			Expect(resp.Header.Get("Access-Control-Allow-Methods")).To(Equal("GET, OPTIONS"))
			Expect(resp.Header.Get("Access-Control-Allow-Headers")).To(Equal("Content-Type"))
		})

		It("should handle OPTIONS request for OpenAPI YAML", func() {
			resp := MakeRequest(TestRequest{
				Method: "OPTIONS",
				Path:   "/openapi.yaml",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))

			// Verify CORS headers are present and correct
			Expect(resp.Header.Get("Access-Control-Allow-Origin")).To(Equal("*"))
			Expect(resp.Header.Get("Access-Control-Allow-Methods")).To(Equal("GET, OPTIONS"))
			Expect(resp.Header.Get("Access-Control-Allow-Headers")).To(Equal("Content-Type"))
		})

		It("should include CORS headers in GET request for OpenAPI JSON", func() {
			resp := MakeRequest(TestRequest{
				Method: "GET",
				Path:   "/openapi.json",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))
			Expect(resp.Header.Get("Content-Type")).To(Equal("application/json"))

			// Verify CORS headers are present and correct for GET requests too
			Expect(resp.Header.Get("Access-Control-Allow-Origin")).To(Equal("*"))
			Expect(resp.Header.Get("Access-Control-Allow-Methods")).To(Equal("GET, OPTIONS"))
			Expect(resp.Header.Get("Access-Control-Allow-Headers")).To(Equal("Content-Type"))
		})

		It("should include CORS headers in GET request for OpenAPI YAML", func() {
			resp := MakeRequest(TestRequest{
				Method: "GET",
				Path:   "/openapi.yaml",
			})
			defer resp.Body.Close()

			Expect(resp.StatusCode).To(Equal(http.StatusOK))
			Expect(resp.Header.Get("Content-Type")).To(Equal("text/yaml"))

			// Verify CORS headers are present and correct for GET requests too
			Expect(resp.Header.Get("Access-Control-Allow-Origin")).To(Equal("*"))
			Expect(resp.Header.Get("Access-Control-Allow-Methods")).To(Equal("GET, OPTIONS"))
			Expect(resp.Header.Get("Access-Control-Allow-Headers")).To(Equal("Content-Type"))
		})
	})

	Describe("getDynamicSpec function", func() {
		var (
			handler *OpenAPIHandler
		)

		BeforeEach(func() {
			logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
			cfg := config.EnvConfig{
				APIPathPrefix: "/test/api/v1",
			}

			var err error
			handler, err = NewOpenAPIHandler(logger, cfg)
			Expect(err).NotTo(HaveOccurred())
			Expect(handler).NotTo(BeNil())
		})

		It("should replace /api/v1 with custom prefix in paths", func() {
			dynamicSpec := handler.getDynamicSpec()
			Expect(dynamicSpec).NotTo(BeNil())

			// Marshal the spec to JSON to inspect the paths
			specJSON, err := json.Marshal(dynamicSpec)
			Expect(err).NotTo(HaveOccurred())

			specString := string(specJSON)

			// Verify that /api/v1 paths have been replaced with /test/api/v1
			Expect(specString).To(ContainSubstring("/test/api/v1/config"))
			Expect(specString).To(ContainSubstring("/test/api/v1/models"))
			Expect(specString).To(ContainSubstring("/test/api/v1/vector-dbs"))

			// Verify that original /api/v1 paths are not present
			Expect(specString).NotTo(ContainSubstring("\"/api/v1/config\""))
			Expect(specString).NotTo(ContainSubstring("\"/api/v1/models\""))
			Expect(specString).NotTo(ContainSubstring("\"/api/v1/vector-dbs\""))
		})

		It("should preserve non-/api/v1 paths", func() {
			dynamicSpec := handler.getDynamicSpec()
			Expect(dynamicSpec).NotTo(BeNil())

			// Marshal the spec to JSON to inspect the paths
			specJSON, err := json.Marshal(dynamicSpec)
			Expect(err).NotTo(HaveOccurred())

			specString := string(specJSON)

			// Verify that non-/api/v1 paths are preserved
			Expect(specString).To(ContainSubstring("/healthcheck"))
		})

		Context("with different API prefixes", func() {
			It("should work with /rag/api/v1 prefix", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/rag/api/v1",
				}

				ragHandler, err := NewOpenAPIHandler(logger, cfg)
				Expect(err).NotTo(HaveOccurred())

				dynamicSpec := ragHandler.getDynamicSpec()
				Expect(dynamicSpec).NotTo(BeNil())

				specJSON, err := json.Marshal(dynamicSpec)
				Expect(err).NotTo(HaveOccurred())
				specString := string(specJSON)

				Expect(specString).To(ContainSubstring("/rag/api/v1/config"))
				Expect(specString).To(ContainSubstring("/rag/api/v1/models"))
			})

			It("should work with /custom/v2 prefix", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/custom/v2",
				}

				customHandler, err := NewOpenAPIHandler(logger, cfg)
				Expect(err).NotTo(HaveOccurred())

				dynamicSpec := customHandler.getDynamicSpec()
				Expect(dynamicSpec).NotTo(BeNil())

				specJSON, err := json.Marshal(dynamicSpec)
				Expect(err).NotTo(HaveOccurred())
				specString := string(specJSON)

				Expect(specString).To(ContainSubstring("/custom/v2/config"))
				Expect(specString).To(ContainSubstring("/custom/v2/models"))
			})
		})

		It("should return a valid OpenAPI spec structure", func() {
			dynamicSpec := handler.getDynamicSpec()
			Expect(dynamicSpec).NotTo(BeNil())

			// Verify basic OpenAPI structure
			Expect(dynamicSpec.OpenAPI).To(Equal("3.0.3"))
			Expect(dynamicSpec.Info).NotTo(BeNil())
			Expect(dynamicSpec.Info.Title).To(Equal("Llama Stack Modular UI REST API"))
			Expect(dynamicSpec.Paths).NotTo(BeNil())
			Expect(len(dynamicSpec.Paths.Map())).To(BeNumerically(">", 0))
		})
	})

	Describe("getDynamicSpecYAML function", func() {
		var (
			handler *OpenAPIHandler
		)

		BeforeEach(func() {
			logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
			cfg := config.EnvConfig{
				APIPathPrefix: "/yaml/api/v1",
			}

			var err error
			handler, err = NewOpenAPIHandler(logger, cfg)
			Expect(err).NotTo(HaveOccurred())
			Expect(handler).NotTo(BeNil())
		})

		It("should replace /api/v1 with custom prefix in YAML content", func() {
			yamlBytes := handler.getDynamicSpecYAML()
			Expect(yamlBytes).NotTo(BeNil())

			yamlContent := string(yamlBytes)

			// Verify that /api/v1 paths have been replaced with /yaml/api/v1
			Expect(yamlContent).To(ContainSubstring("/yaml/api/v1/config"))
			Expect(yamlContent).To(ContainSubstring("/yaml/api/v1/models"))
			Expect(yamlContent).To(ContainSubstring("/yaml/api/v1/vector-dbs"))

			// Verify that original /api/v1 paths are not present (they should be replaced)
			// Note: We check for the path as a YAML key, not just the string
			Expect(yamlContent).NotTo(MatchRegexp(`^\s*/api/v1/config:`))
			Expect(yamlContent).NotTo(MatchRegexp(`^\s*/api/v1/models:`))
			Expect(yamlContent).NotTo(MatchRegexp(`^\s*/api/v1/vector-dbs:`))
		})

		It("should preserve non-/api/v1 paths in YAML", func() {
			yamlBytes := handler.getDynamicSpecYAML()
			Expect(yamlBytes).NotTo(BeNil())

			yamlContent := string(yamlBytes)

			// Verify that non-/api/v1 paths are preserved
			Expect(yamlContent).To(ContainSubstring("/healthcheck:"))
		})

		It("should produce valid YAML", func() {
			yamlBytes := handler.getDynamicSpecYAML()
			Expect(yamlBytes).NotTo(BeNil())

			// Try to parse the YAML to ensure it's valid
			var yamlData map[string]interface{}
			err := yaml.Unmarshal(yamlBytes, &yamlData)
			Expect(err).NotTo(HaveOccurred())

			// Verify basic structure
			Expect(yamlData["openapi"]).To(Equal("3.0.3"))
			Expect(yamlData["info"]).NotTo(BeNil())
			Expect(yamlData["paths"]).NotTo(BeNil())
		})
	})

	Describe("Error handling", func() {
		Context("when OpenAPI spec file is missing", func() {
			It("should return an error when creating OpenAPIHandler", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/api/v1",
				}

				// Create a temporary directory without the OpenAPI spec file
				tempDir, err := os.MkdirTemp("", "openapi-missing-test-*")
				Expect(err).NotTo(HaveOccurred())
				nonExistentSpecPath := filepath.Join(tempDir, "nonexistent", "spec.yaml")

				handler, err := NewOpenAPIHandlerWithSpecPath(logger, cfg, nonExistentSpecPath)
				Expect(err).To(HaveOccurred())
				Expect(handler).To(BeNil())
				Expect(errors.Is(err, os.ErrNotExist)).To(BeTrue())
			})
		})

		Context("with corrupted spec", func() {
			It("should return error when creating handler with invalid YAML syntax", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/api/v1",
				}

				// Create a temporary directory with corrupted YAML
				tempDir, err := os.MkdirTemp("", "openapi-corrupted-test-*")
				Expect(err).NotTo(HaveOccurred())
				defer os.RemoveAll(tempDir)

				// Create corrupted YAML file with invalid syntax
				corruptedYAML := `openapi: 3.0.3
info:
  title: Corrupted Spec
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        "200":
          description: "OK"
          content:
            application/json:
              schema:
                type: object
                properties:
                  invalid: [unclosed array
                  another: "missing quote
`

				corruptedSpecPath := filepath.Join(tempDir, "corrupted.yaml")
				err = os.WriteFile(corruptedSpecPath, []byte(corruptedYAML), 0644)
				Expect(err).NotTo(HaveOccurred())

				// Attempt to create handler with corrupted spec
				handler, err := NewOpenAPIHandlerWithSpecPath(logger, cfg, corruptedSpecPath)
				Expect(err).To(HaveOccurred())
				Expect(handler).To(BeNil())
				Expect(err.Error()).To(ContainSubstring("yaml"))
			})

			It("should handle marshal errors gracefully in getDynamicSpec and return original spec as fallback", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/api/v1",
				}

				// Set up temporary OpenAPI spec files
				specPath, tmpRoot, err := setupTempOpenAPISpec()
				Expect(err).NotTo(HaveOccurred())
				defer os.RemoveAll(tmpRoot)

				// Create handler with valid spec using the temporary spec path
				handler, err := NewOpenAPIHandlerWithSpecPath(logger, cfg, specPath)
				Expect(err).NotTo(HaveOccurred())

				// Store the original spec for comparison
				originalSpec := handler.spec

				// Create a mock spec that will cause marshal errors by adding a problematic field
				// We'll modify the spec to include a field that can't be marshaled
				// This simulates the error path in getDynamicSpec
				handler.spec.Extensions = map[string]interface{}{
					"problematic": &unmarshalableType{},
				}

				// Call getDynamicSpec - it should handle the marshal error and return the original spec
				dynamicSpec := handler.getDynamicSpec()
				Expect(dynamicSpec).NotTo(BeNil())

				// Since marshal failed, it should return the original spec as fallback
				Expect(dynamicSpec).To(Equal(originalSpec))
				Expect(dynamicSpec.OpenAPI).To(Equal("3.0.3"))
			})

			It("should handle unmarshal errors gracefully in getDynamicSpec and return original spec as fallback", func() {
				logger := slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug}))
				cfg := config.EnvConfig{
					APIPathPrefix: "/api/v1",
				}

				// Set up temporary OpenAPI spec files
				specPath, tmpRoot, err := setupTempOpenAPISpec()
				Expect(err).NotTo(HaveOccurred())
				defer os.RemoveAll(tmpRoot)

				// Create handler with valid spec using the temporary spec path
				handler, err := NewOpenAPIHandlerWithSpecPath(logger, cfg, specPath)
				Expect(err).NotTo(HaveOccurred())

				// Store the original spec for comparison
				originalSpec := handler.spec

				// Create a mock spec that will cause unmarshal errors
				// We'll modify the spec to include a field that will cause unmarshal issues
				// by creating a field that will cause JSON marshaling to produce invalid JSON
				handler.spec.Extensions = map[string]interface{}{
					"invalid": &invalidJSONType{},
				}

				// Call getDynamicSpec - it should handle the unmarshal error and return the original spec
				dynamicSpec := handler.getDynamicSpec()
				Expect(dynamicSpec).NotTo(BeNil())

				// Since unmarshal failed, it should return the original spec as fallback
				Expect(dynamicSpec).To(Equal(originalSpec))
				Expect(dynamicSpec.OpenAPI).To(Equal("3.0.3"))
			})
		})
	})
})

// responseRecorder is a helper for testing HTTP responses
type responseRecorder struct {
	statusCode int
	header     http.Header
	body       []byte
}

func (r *responseRecorder) Header() http.Header {
	return r.header
}

func (r *responseRecorder) Write(data []byte) (int, error) {
	if r.statusCode == 0 {
		r.statusCode = http.StatusOK
	}
	r.body = append(r.body, data...)
	return len(data), nil
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.statusCode = statusCode
}

// unmarshalableType is a type that will cause marshal errors
type unmarshalableType struct{}

func (u *unmarshalableType) MarshalJSON() ([]byte, error) {
	return nil, errors.New("intentional marshal error")
}

// invalidJSONType is a type that will cause JSON marshaling to produce invalid JSON
type invalidJSONType struct{}

func (i *invalidJSONType) MarshalJSON() ([]byte, error) {
	// Return invalid JSON that will cause unmarshal errors
	return []byte(`{"invalid": "unclosed quote`), nil
}
