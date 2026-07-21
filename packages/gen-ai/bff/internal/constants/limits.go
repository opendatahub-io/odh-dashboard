package constants

import "time"

const (
	// DefaultMaxBodySize is the global safety-net body limit applied via middleware
	// to all API routes. Individual handlers set tighter limits as needed.
	DefaultMaxBodySize = 50 << 20 // 50MB

	// ResponsesMaxBodySize caps the request body for POST /lsd/responses.
	// With the file_id architecture, payloads contain JSON with small file_id
	// references (not base64), chat_context text, and MCP tool schemas.
	ResponsesMaxBodySize = 20 << 20 // 20MB

	// FileUploadMaxBodySize caps multipart uploads for vector store documents.
	// Matches frontend FILE_UPLOAD_CONFIG.MAX_FILE_SIZE.
	FileUploadMaxBodySize = 10 << 20 // 10MB

	// VisionUploadMaxBodySize caps multipart uploads for vision image files.
	// Matches frontend VISION_UPLOAD_CONFIG.MAX_FILE_SIZE.
	VisionUploadMaxBodySize = 10 << 20 // 10MB

	// AudioUploadMaxBodySize caps audio file size for ASR transcription.
	AudioUploadMaxBodySize = 10 << 20 // 10MB

	// MediaUploadMaxBodySize is the ceiling used by the media upload handler for
	// initial body parsing. Set to the largest per-type limit (currently 10MB).
	MediaUploadMaxBodySize = 10 << 20 // 10MB

	// OGXFileRetrievalTimeout is the timeout for retrieving file content from OGX.
	OGXFileRetrievalTimeout = 10 * time.Second

	// ASRTranscriptionTimeout is the timeout for the ASR model to transcribe audio.
	ASRTranscriptionTimeout = 90 * time.Second

	// AudioTranscriptionTotalTimeout is the outer timeout budget for the full
	// audio transcription flow (OGX retrieval + ASR call).
	AudioTranscriptionTotalTimeout = 100 * time.Second
)
