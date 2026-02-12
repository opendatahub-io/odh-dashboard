package maas

import (
	"embed"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
)

//go:embed testdata
var testdataFs embed.FS

func CreateMaasFakeServer() *httptest.Server {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			if r.URL.Path == "/v1/api-keys" {
				sendFakeResponse("api-keys-list.json", http.StatusOK, w)
				return
			}
			if strings.HasPrefix(r.URL.Path, "/v1/api-keys/") {
				sendFakeResponse("get-api-key-response.json", http.StatusOK, w)
				return
			}
			if r.URL.Path == "/v1/models" {
				sendFakeResponse("maas-models-list.json", http.StatusOK, w)
				return
			}

		case http.MethodPost:
			if r.URL.Path == "/v1/api-keys" {
				sendFakeResponse("create-api-key-response.json", http.StatusCreated, w)
				return
			}

		case http.MethodDelete:
			if r.URL.Path == "/v1/tokens" {
				w.WriteHeader(http.StatusNoContent)
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
