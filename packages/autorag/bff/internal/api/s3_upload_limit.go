package api

import "net/http"

// s3MaxUploadFileBytes is the maximum allowed size for the uploaded file (1 GiB).
const s3MaxUploadFileBytes int64 = 1 << 30

// s3MultipartMaxEnvelopeBytes is headroom for multipart boundaries and non-file form fields.
const s3MultipartMaxEnvelopeBytes int64 = 64 << 20 // 64 MiB

// s3PostDeclaredBodyExceedsLimit is true when the client sent a positive Content-Length larger than
// allowed (fast reject). Unknown length (e.g. chunked) returns false; the file part is still
// capped by http.MaxBytesReader in the handler.
func s3PostDeclaredBodyExceedsLimit(r *http.Request) bool {
	if r.ContentLength <= 0 {
		return false
	}
	return r.ContentLength > s3MaxUploadFileBytes+s3MultipartMaxEnvelopeBytes
}
