package maas

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
)

func CreateMaasFakeServer() *httptest.Server {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "GET" {
			if r.URL.Path == "/v1/api-keys" {
				sendFakeResponse("api-keys-list.json", http.StatusOK, w)
				return
			}
			if strings.HasPrefix(r.URL.Path, "/v1/api-keys/") {
				sendFakeResponse("get-api-key-response.json", http.StatusOK, w)
				return
			}
		} else if r.Method == "POST" {
			if r.URL.Path == "/v1/api-keys" {
				sendFakeResponse("create-api-key-response.json", http.StatusCreated, w)
				return
			}
		} else {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}

		w.WriteHeader(http.StatusNotFound)
	}))

	return ts
}

func sendFakeResponse(path string, status int, w http.ResponseWriter) {
	path = filepath.Join("internal", "testdata", "maas", path)
	fileBytes, err := os.ReadFile(path)
	if err != nil {
		w.Header().Add("Content-Type", "application/json")
		w.WriteHeader(http.StatusInternalServerError)
		pwd, _ := os.Getwd()
		_, err = w.Write([]byte(`{"error": "Failed to read file", "pwd": "` + pwd + `" "description": "` + err.Error() + `"}`))
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
