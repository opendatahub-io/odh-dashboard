package constants

// ASR error codes sent to the frontend in ErrorDetail.Code.
// The frontend maps these via microcopy templates keyed as "asr:<code>".
const (
	ASRCodeModelNotFound   = "model_not_found"
	ASRCodeModelNotRunning = "model_not_running"
	ASRCodeModelNoEndpoint = "model_no_endpoint"
	ASRCodeModelInvalid    = "model_invalid"
	ASRCodeUnreachable     = "unreachable"
	ASRCodeTimeout         = "timeout"
	ASRCodeAuthFailed      = "auth_failed"
	ASRCodeServiceError    = "service_error"
	ASRCodeInvalidResponse = "invalid_response"
	ASRCodeNoSpeech        = "no_speech"
	ASRCodeFileRetrieval   = "file_retrieval_failed"
	ASRCodeInvalidFormat   = "invalid_format"
)
