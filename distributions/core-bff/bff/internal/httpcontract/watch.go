package httpcontract

import (
	"bufio"
	"compress/gzip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

const maxWatchEventBytes = 4 << 20 // Includes the newline delimiter, when present.

var (
	errWatchEventTooLarge  = errors.New("watch event exceeds buffering limit")
	errMalformedWatchEvent = errors.New("invalid watch event JSON")
)

func prepareWatchResponse(resp *http.Response) error {
	mediaType, _, err := mime.ParseMediaType(resp.Header.Get(constants.HeaderContentType))
	if err != nil || mediaType != constants.ContentTypeJSON {
		return fmt.Errorf("unsupported watch response media type")
	}
	body := resp.Body
	observed, _ := body.(*observedBody)
	if observed != nil {
		body = observed.ReadCloser
	}
	if resp.Header.Get(constants.HeaderContentEncoding) == constants.ContentEncodingGzip {
		decoded, err := gzip.NewReader(body)
		if err != nil {
			return fmt.Errorf("invalid watch response encoding")
		}
		body = struct {
			io.Reader
			io.Closer
		}{decoded, body}
		resp.Header.Del(constants.HeaderContentEncoding)
		resp.Uncompressed = true
	}
	if resp.Header.Get(constants.HeaderContentEncoding) != "" {
		return fmt.Errorf("unsupported watch response encoding")
	}
	body = newProxyWatchBody(body, resp.Request)
	if observed != nil {
		// Observe parser failures as well as upstream I/O errors, once.
		observed.ReadCloser = body
	} else {
		resp.Body = body
	}
	resp.ContentLength = -1
	resp.Header.Del(constants.HeaderContentLength)
	return nil
}

// SanitizeWatchEvent applies strict sanitization without a caller-token request.
// Resource events and bookmarks retain their bytes, including whitespace.
func SanitizeWatchEvent(b []byte) []byte {
	return ProxyWatchEvent(b, nil)
}

// ProxyWatchEvent applies the same caller/Secret boundary as ordinary HTTP failures.
func ProxyWatchEvent(b []byte, r *http.Request) []byte {
	var event map[string]json.RawMessage
	if json.Unmarshal(b, &event) != nil {
		return b
	}
	var eventType string
	if json.Unmarshal(event["type"], &eventType) != nil || eventType != "ERROR" {
		return b
	}
	var status metav1.Status
	_ = json.Unmarshal(event["object"], &status)
	code := int(status.Code)
	if code < http.StatusBadRequest || code > maxHTTPErrorStatus {
		code = http.StatusInternalServerError
	}
	clean, err := json.Marshal(ProxyStatus(status, code, r))
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
	request *http.Request
}

func (b *watchBody) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if len(b.pending) == 0 {
		if b.err != nil {
			return 0, b.err
		}
		line, err := b.readEvent()
		b.err = err
		if err != nil && !errors.Is(err, io.EOF) {
			return 0, err // Never forward a fragment from an interrupted event.
		}
		if len(line) == 0 {
			return 0, err
		}
		if !json.Valid(line) {
			b.err = errMalformedWatchEvent
			return 0, b.err
		}
		b.pending = ProxyWatchEvent(line, b.request)
	}
	n := copy(p, b.pending)
	b.pending = b.pending[n:]
	if len(b.pending) == 0 {
		return n, b.err
	}
	return n, nil
}

func (b *watchBody) readEvent() ([]byte, error) {
	var event []byte
	for {
		fragment, err := b.reader.ReadSlice('\n')
		if len(event)+len(fragment) > maxWatchEventBytes {
			return nil, errWatchEventTooLarge
		}
		event = append(event, fragment...)
		if !errors.Is(err, bufio.ErrBufferFull) {
			return event, err
		}
	}
}

func newWatchBody(body io.ReadCloser) io.ReadCloser {
	return newProxyWatchBody(body, nil)
}

func newProxyWatchBody(body io.ReadCloser, r *http.Request) io.ReadCloser {
	return &watchBody{ReadCloser: body, reader: bufio.NewReader(body), request: r}
}
