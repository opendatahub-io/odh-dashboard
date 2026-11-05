package httpcontract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strconv"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

const maxErrorBody = 1 << 20

// KubernetesResponse preserves error status/semantics while removing untrusted free text.
// Resource responses remain untouched; JSON watches sanitize only ERROR events, one event at a time.
func KubernetesResponse(resp *http.Response) error {
	if resp.Request != nil {
		CaptureAudit(resp.Request.Context(), resp.Header)
	}
	if resp.StatusCode < 400 {
		if resp.StatusCode == http.StatusOK && IsWatchRequest(resp.Request) && resp.Body != nil {
			mediaType, _, err := mime.ParseMediaType(resp.Header.Get(constants.HeaderContentType))
			if err != nil || mediaType != constants.ContentTypeJSON {
				return fmt.Errorf("unsupported watch response media type")
			}
			if resp.Header.Get(constants.HeaderContentEncoding) != "" {
				return fmt.Errorf("unsupported watch response encoding")
			}
			if observed, ok := resp.Body.(*observedBody); ok {
				// Observe parser failures as well as upstream I/O errors, once.
				observed.ReadCloser = newWatchBody(observed.ReadCloser)
			} else {
				resp.Body = newWatchBody(resp.Body)
			}
			resp.ContentLength = -1
			resp.Header.Del(constants.HeaderContentLength)
		}
		return nil
	}
	var s metav1.Status
	if resp.Body != nil {
		b, err := io.ReadAll(io.LimitReader(resp.Body, maxErrorBody+1))
		_ = resp.Body.Close()
		if err == nil && len(b) <= maxErrorBody {
			_ = json.Unmarshal(b, &s)
		}
	}
	s = SanitizeStatus(s, resp.StatusCode)
	b, err := json.Marshal(s)
	if err != nil {
		return fmt.Errorf("could not encode Kubernetes status")
	}
	resp.Body = io.NopCloser(bytes.NewReader(b))
	resp.ContentLength = int64(len(b))
	resp.Header.Set(constants.HeaderContentLength, strconv.Itoa(len(b)))
	resp.Header.Set(constants.HeaderContentType, constants.ContentTypeJSON)
	resp.Header.Del(constants.HeaderContentEncoding)
	CopyRetryAfter(resp.Header, resp.Header) // Normalize retry metadata in place.
	for _, header := range []string{constants.HeaderAuthorization, constants.HeaderProxyAuthorization, constants.HeaderCookie, constants.HeaderSetCookie, constants.HeaderForwardedToken, constants.HeaderSecWebSocketProto} {
		resp.Header.Del(header)
	}
	resp.Header.Del(constants.HeaderTrailer)
	resp.Trailer = nil
	return nil
}

// IsWatchRequest matches Kubernetes query conversion for the watch parameter.
func IsWatchRequest(r *http.Request) bool {
	if r == nil {
		return false
	}
	values := r.URL.Query()["watch"]
	var watch bool
	err := runtime.Convert_Slice_string_To_bool(&values, &watch, nil)
	return err == nil && watch
}

// CopyRetryAfter preserves only standard delta-seconds or HTTP-date retry metadata.
func CopyRetryAfter(dst, src http.Header) {
	value := src.Get(constants.HeaderRetryAfter)
	if n, err := strconv.ParseInt(value, 10, 32); err == nil && n >= 0 {
		dst.Set(constants.HeaderRetryAfter, strconv.FormatInt(n, 10))
		return
	}
	if date, err := http.ParseTime(value); err == nil {
		dst.Set(constants.HeaderRetryAfter, date.UTC().Format(http.TimeFormat))
		return
	}
	dst.Del(constants.HeaderRetryAfter)
}
