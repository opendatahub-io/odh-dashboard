package proxy

import (
	"errors"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Gorilla does not define a constant for the Bad Gateway close code.
	wsCloseBadGateway = 1014

	wsMinApplicationCloseCode = 3000
	wsMaxApplicationCloseCode = 4999
	writeControlTimeout       = 5 * time.Second
)

func closeCodeFromError(err error) int {
	var ce *websocket.CloseError
	if errors.As(err, &ce) {
		return normalizeReceivedCloseCode(ce.Code)
	}
	return sanitizeCloseCode(websocket.CloseInternalServerErr)
}

// Gorilla reports a valid empty close frame using an internal-only status code.
func normalizeReceivedCloseCode(code int) int {
	if code == websocket.CloseNoStatusReceived {
		return websocket.CloseNormalClosure
	}
	return sanitizeCloseCode(code)
}

func sendCloseMessage(conn *websocket.Conn, err error) {
	_ = conn.WriteControl(websocket.CloseMessage,
		websocket.FormatCloseMessage(closeCodeFromError(err), closeReason(closeCodeFromError(err))),
		time.Now().Add(writeControlTimeout))
}

func sanitizeCloseCode(code int) int {
	if code >= wsMinApplicationCloseCode && code <= wsMaxApplicationCloseCode {
		return code
	}

	switch code {
	case websocket.CloseNormalClosure,
		websocket.CloseGoingAway,
		websocket.CloseProtocolError,
		websocket.CloseUnsupportedData,
		websocket.CloseInvalidFramePayloadData,
		websocket.ClosePolicyViolation,
		websocket.CloseMessageTooBig,
		websocket.CloseMandatoryExtension,
		websocket.CloseInternalServerErr,
		websocket.CloseServiceRestart,
		websocket.CloseTryAgainLater,
		wsCloseBadGateway:
		return code
	default:
		return websocket.CloseInternalServerErr
	}
}

func closeReason(code int) string {
	switch code {
	case websocket.CloseNormalClosure:
		return "normal closure"
	case websocket.CloseGoingAway:
		return "connection closing"
	case websocket.ClosePolicyViolation:
		return "policy rejection"
	default:
		return "connection ended"
	}
}

func sendCloseMessageForShutdown(conn *websocket.Conn, deadline time.Time) {
	if conn != nil {
		_ = conn.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseGoingAway, "server shutting down"), deadline)
	}
}
