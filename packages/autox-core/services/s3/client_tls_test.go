package s3

import (
	"bytes"
	"context"
	"crypto/x509"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"sort"
	"strconv"
	"strings"
	"sync"
	"testing"
)

// Exercise the real transfer manager and TLS transport with the non-seekable
// body used by the BFF upload handlers. A plain HTTP endpoint does not trigger
// the streaming checksum trailer that NetApp ONTAP rejects.
func TestDefaultClient_UploadObjectToStrictTLSS3(t *testing.T) {
	for _, tc := range []struct {
		name          string
		size          int
		wantMultipart bool
	}{
		{name: "small object", size: 1 << 20},
		{name: "object below multipart threshold", size: 9 << 20},
		{name: "multipart object", size: 17 << 20, wantMultipart: true},
	} {
		t.Run(tc.name, func(t *testing.T) {
			payload := bytes.Repeat([]byte("0123456789abcdef"), tc.size/16)
			var mu sync.Mutex
			var object []byte
			parts := make(map[int][]byte)
			var rejected int
			var initiations, completions, singlePuts int

			server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				if r.Header.Get("X-Amz-Content-Sha256") == "STREAMING-UNSIGNED-PAYLOAD-TRAILER" || r.Header.Get("X-Amz-Trailer") != "" {
					mu.Lock()
					rejected++
					mu.Unlock()
					w.Header().Set("Content-Type", "application/xml")
					w.WriteHeader(http.StatusBadRequest)
					_, _ = io.WriteString(w, "<Error><Code>InvalidArgument</Code><Message>x-amz-content-sha256 must be UNSIGNED-PAYLOAD, STREAMING-AWS4-HMAC-SHA256-PAYLOAD or a valid sha256 value</Message></Error>")
					return
				}

				switch {
				case r.Method == http.MethodPost && r.URL.Query().Has("uploads"):
					mu.Lock()
					initiations++
					mu.Unlock()
					w.Header().Set("Content-Type", "application/xml")
					_, _ = io.WriteString(w, "<InitiateMultipartUploadResult><UploadId>test-upload</UploadId></InitiateMultipartUploadResult>")
				case r.Method == http.MethodPut:
					if got := r.Header.Get("X-Amz-Content-Sha256"); got != "UNSIGNED-PAYLOAD" {
						http.Error(w, fmt.Sprintf("x-amz-content-sha256 = %q", got), http.StatusBadRequest)
						return
					}
					part := r.URL.Query().Get("partNumber")
					if part == "" {
						if got := r.Header.Get("If-None-Match"); got != "*" {
							http.Error(w, fmt.Sprintf("If-None-Match = %q", got), http.StatusBadRequest)
							return
						}
						if got := r.Header.Get("X-Amz-Sdk-Checksum-Algorithm"); got != "" {
							http.Error(w, fmt.Sprintf("unexpected checksum algorithm %q", got), http.StatusBadRequest)
							return
						}
						for name := range r.Header {
							if strings.HasPrefix(strings.ToLower(name), "x-amz-checksum-") {
								http.Error(w, fmt.Sprintf("unexpected checksum header %q", name), http.StatusBadRequest)
								return
							}
						}
					}
					body, err := io.ReadAll(r.Body)
					if err != nil {
						http.Error(w, err.Error(), http.StatusBadRequest)
						return
					}
					mu.Lock()
					if part != "" {
						partNumber, err := strconv.Atoi(part)
						if err != nil {
							mu.Unlock()
							http.Error(w, "invalid part number", http.StatusBadRequest)
							return
						}
						parts[partNumber] = body
					} else {
						singlePuts++
						object = body
					}
					mu.Unlock()
					w.Header().Set("ETag", `"test-etag"`)
				case r.Method == http.MethodPost && r.URL.Query().Has("uploadId"):
					if got := r.Header.Get("If-None-Match"); got != "*" {
						http.Error(w, fmt.Sprintf("If-None-Match = %q", got), http.StatusBadRequest)
						return
					}
					mu.Lock()
					completions++
					mu.Unlock()
					w.Header().Set("Content-Type", "application/xml")
					_, _ = io.WriteString(w, `<CompleteMultipartUploadResult><ETag>"test-etag"</ETag></CompleteMultipartUploadResult>`)
				case r.Method == http.MethodDelete && r.URL.Query().Has("uploadId"):
					w.WriteHeader(http.StatusNoContent)
				default:
					http.Error(w, "unexpected S3 request", http.StatusBadRequest)
				}
			}))
			defer server.Close()

			_, port, err := net.SplitHostPort(server.Listener.Addr().String())
			if err != nil {
				t.Fatal(err)
			}
			roots := x509.NewCertPool()
			roots.AddCert(server.Certificate())
			client := NewDefaultClient(ClientConfig{
				RootCAs: roots,
				WrapTransport: func(rt http.RoundTripper) http.RoundTripper {
					transport := rt.(*http.Transport).Clone()
					transport.Proxy = nil
					// Route the test certificate's example.com name to the local server.
					transport.DialContext = func(ctx context.Context, network, _ string) (net.Conn, error) {
						return (&net.Dialer{}).DialContext(ctx, network, server.Listener.Addr().String())
					}
					return transport
				},
			})
			opts := testOpts()
			opts.BaseEndpoint = "https://example.com:" + port

			err = client.UploadObject(context.Background(), opts, UploadObjectInput{
				Bucket: "bucket", Key: "file.pdf", Body: io.LimitReader(bytes.NewReader(payload), int64(len(payload))), ContentType: "application/pdf",
			})
			if err != nil {
				t.Fatalf("upload to strict TLS S3 endpoint failed: %v", err)
			}

			mu.Lock()
			defer mu.Unlock()
			if rejected != 0 {
				t.Errorf("strict S3 endpoint rejected %d checksum trailer request(s)", rejected)
			}
			if tc.wantMultipart {
				if initiations != 1 || len(parts) < 2 || completions != 1 || singlePuts != 0 {
					t.Errorf("multipart requests: initiations=%d parts=%d completions=%d single PUTs=%d", initiations, len(parts), completions, singlePuts)
				}
			} else if initiations != 0 || len(parts) != 0 || completions != 0 || singlePuts != 1 {
				t.Errorf("single PUT requests: initiations=%d parts=%d completions=%d single PUTs=%d", initiations, len(parts), completions, singlePuts)
			}
			if len(parts) > 0 {
				partNumbers := make([]int, 0, len(parts))
				for number := range parts {
					partNumbers = append(partNumbers, number)
				}
				sort.Ints(partNumbers)
				for _, number := range partNumbers {
					object = append(object, parts[number]...)
				}
			}
			if !bytes.Equal(object, payload) {
				t.Errorf("uploaded body has %d bytes, want %d matching bytes", len(object), len(payload))
			}
		})
	}
}
