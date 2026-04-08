package api

import "net/http"

// s3MaxUploadFileBytes is the maximum allowed size for the uploaded file (32 MiB).
const s3MaxUploadFileBytes int64 = 32 << 20

// s3MultipartMaxEnvelopeBytes is headroom for multipart boundaries and non-file form fields.
const s3MultipartMaxEnvelopeBytes int64 = 64 << 20 // 64 MiB

// s3PayloadTooLargeMsg is the error message when the total request body exceeds the maximum allowed size.
const s3PayloadTooLargeMsg = "request body exceeds maximum upload size (32 MiB plus allowance for multipart framing)"

// s3FilePartTooLargeMsg is the error message when the file part exceeds the maximum allowed size.
const s3FilePartTooLargeMsg = "file exceeds maximum size of 32 MiB"

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
