package httpcontract

import (
	"bufio"
	"bytes"
	"encoding/json"
	"io"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// SanitizeWatchEvent changes only Kubernetes watch ERROR Status objects. Resource events,
// bookmarks and non-watch/subprotocol messages retain their bytes, including whitespace.
func SanitizeWatchEvent(b []byte) []byte {
	var event map[string]json.RawMessage
	if json.Unmarshal(b, &event) != nil || !bytes.Equal(event["type"], []byte(`"ERROR"`)) {
		return b
	}
	var status metav1.Status
	_ = json.Unmarshal(event["object"], &status)
	code := int(status.Code)
	if code < 400 || code > 599 {
		code = 500
	}
	clean, err := json.Marshal(SanitizeStatus(status, code))
	if err != nil {
		return b
	}
	event["object"] = clean
	result, err := json.Marshal(event)
	if err != nil {
		return b
	}
	if len(b) > 0 && b[len(b)-1] == '\n' {
		result = append(result, '\n')
	}
	return result
}

// watchBody buffers one newline-delimited Kubernetes event at a time, never the complete watch.
// It preserves original read errors, so failed streams are terminated by ReverseProxy normally.
type watchBody struct {
	io.ReadCloser
	reader  *bufio.Reader
	pending []byte
	err     error
}

func (b *watchBody) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if len(b.pending) == 0 {
		if b.err != nil {
			return 0, b.err
		}
		line, err := b.reader.ReadBytes('\n')
		b.pending = SanitizeWatchEvent(line)
		b.err = err
	}
	n := copy(p, b.pending)
	b.pending = b.pending[n:]
	if len(b.pending) == 0 {
		return n, b.err
	}
	return n, nil
}
func newWatchBody(body io.ReadCloser) io.ReadCloser {
	return &watchBody{ReadCloser: body, reader: bufio.NewReader(body)}
}
