package maas

import (
	"embed"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/opendatahub-io/maas-library/bff/internal/models"
)

//go:embed testdata
var testdataFs embed.FS

func CreateMaasFakeServer() *httptest.Server {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if r.URL.Path == "/v1/models" {
				sendFakeResponse("maas-models-list.json", http.StatusOK, w)
				return
			}
			if strings.HasPrefix(r.URL.Path, "/v1/api-keys/") {
				sendFakeResponse("get-api-key-response.json", http.StatusOK, w)
				return
			}

		case http.MethodPost:
			if r.URL.Path == "/v1/api-keys" {
				body, _ := io.ReadAll(r.Body)
				var req struct {
					ExpiresIn string `json:"expiresIn"`
				}
				_ = json.Unmarshal(body, &req)
				if req.ExpiresIn == "trigger_expiration_exceeded" {
					w.Header().Set("Content-Type", "application/json")
					w.WriteHeader(http.StatusInternalServerError)
					_, _ = w.Write([]byte(`{"error":"requested expiration (8760h0m0s) exceeds maximum allowed (90 days)"}`))
					return
				}
				sendFakeResponse("create-api-key-response.json", http.StatusCreated, w)
				return
			}
			if r.URL.Path == "/v1/api-keys/search" {
				handleFakeSearchAPIKeys(w, r)
				return
			}
			if r.URL.Path == "/v1/api-keys/bulk-revoke" {
				sendFakeResponse("bulk-revoke-response.json", http.StatusOK, w)
				return
			}

		case http.MethodDelete:
			if strings.HasPrefix(r.URL.Path, "/v1/api-keys/") {
				sendFakeResponse("revoke-api-key-response.json", http.StatusOK, w)
				return
			}

		default:
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))

	return ts
}

func handleFakeSearchAPIKeys(w http.ResponseWriter, r *http.Request) {
	// Load all keys from the testdata file
	fileBytes, err := testdataFs.ReadFile(filepath.Join("testdata", "api-keys-search-response.json"))
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to read testdata: "+err.Error())
		return
	}

	var fullList models.APIKeyListResponse
	if err := json.Unmarshal(fileBytes, &fullList); err != nil {
		writeJSONError(w, http.StatusInternalServerError, "failed to parse testdata: "+err.Error())
		return
	}

	var req models.APIKeySearchRequest
	if r.Body != nil {
		_ = json.NewDecoder(r.Body).Decode(&req)
	}

	// Apply filters
	filtered := make([]models.APIKey, 0, len(fullList.Data))
	for _, key := range fullList.Data {
		if req.Filters != nil {
			if req.Filters.Username != "" && !strings.Contains(strings.ToLower(key.Username), strings.ToLower(req.Filters.Username)) {
				continue
			}
			if len(req.Filters.Status) > 0 {
				matched := false
				for _, s := range req.Filters.Status {
					if key.Status == s {
						matched = true
						break
					}
				}
				if !matched {
					continue
				}
			}
		}
		filtered = append(filtered, key)
	}

	// Apply sort
	if req.Sort != nil && req.Sort.By != "" {
		sortBy := req.Sort.By
		descending := req.Sort.Order == "desc"
		sort.SliceStable(filtered, func(i, j int) bool {
			var less bool
			switch sortBy {
			case "name":
				less = filtered[i].Name < filtered[j].Name
			case "created_at":
				less = filtered[i].CreationDate.Before(filtered[j].CreationDate)
			case "expires_at":
				if filtered[i].ExpirationDate == nil {
					less = false
				} else if filtered[j].ExpirationDate == nil {
					less = true
				} else {
					less = filtered[i].ExpirationDate.Before(*filtered[j].ExpirationDate)
				}
			case "last_used_at":
				if filtered[i].LastUsedAt == nil {
					less = false
				} else if filtered[j].LastUsedAt == nil {
					less = true
				} else {
					less = filtered[i].LastUsedAt.Before(*filtered[j].LastUsedAt)
				}
			default:
				less = filtered[i].CreationDate.Before(filtered[j].CreationDate)
			}
			if descending {
				return !less
			}
			return less
		})
	}

	// Apply pagination
	limit := 50
	offset := 0
	if req.Pagination != nil {
		if req.Pagination.Limit > 0 {
			limit = req.Pagination.Limit
		}
		if req.Pagination.Offset > 0 {
			offset = req.Pagination.Offset
		}
	}

	total := len(filtered)
	if offset > total {
		offset = total
	}
	end := offset + limit
	hasMore := end < total
	if end > total {
		end = total
	}
	page := filtered[offset:end]

	resp := models.APIKeyListResponse{
		Object:  "list",
		Data:    page,
		HasMore: hasMore,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(resp)
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(`{"error": "` + msg + `"}`))
}

func sendFakeResponse(path string, status int, w http.ResponseWriter) {
	path = filepath.Join("testdata", path)
	fileBytes, err := testdataFs.ReadFile(path)
	if err != nil {
		w.Header().Add("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		pwd, _ := os.Getwd()
		_, err = w.Write([]byte(`{"error": "Failed to read file", "pwd": "` + pwd + `", "description": "` + err.Error() + `"}`))
		if err != nil {
			panic(err)
		}
	}

	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(status)
	_, err = w.Write(fileBytes)
	if err != nil {
		panic(err)
	}
}
