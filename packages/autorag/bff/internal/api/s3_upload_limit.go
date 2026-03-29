package api

import "net/http"

// s3MaxUploadFileBytes is the maximum allowed size for the uploaded file (1 GiB).
const s3MaxUploadFileBytes int64 = 1 << 30

// s3MultipartMaxEnvelopeBytes is headroom for multipart boundaries and non-file form fields.
const s3MultipartMaxEnvelopeBytes int64 = 64 << 20 // 64 MiB

// s3PostMaxTotalBodyBytes is the maximum allowed size of the entire POST body (multipart framing
// plus all parts). Matches rejectDeclaredOversizedS3Post and the MaxBytesReader wrapping r.Body
// before MultipartReader so chunked uploads cannot stream unbounded while skipping non-file parts.
func (app *App) s3PostMaxTotalBodyBytes() int64 {
	if app != nil && app.s3PostMaxRequestBodyBytes > 0 {
		return app.s3PostMaxRequestBodyBytes
	}
	return s3MaxUploadFileBytes + s3MultipartMaxEnvelopeBytes
}

// s3PostDeclaredBodyExceedsLimit is true when the client sent a positive Content-Length larger than
// s3PostMaxTotalBodyBytes (fast reject). Unknown length (e.g. chunked) returns false; the handler
// still wraps r.Body with http.MaxBytesReader before MultipartReader.
func (app *App) s3PostDeclaredBodyExceedsLimit(r *http.Request) bool {
	if r.ContentLength <= 0 {
		return false
	}
	return r.ContentLength > app.s3PostMaxTotalBodyBytes()
}
