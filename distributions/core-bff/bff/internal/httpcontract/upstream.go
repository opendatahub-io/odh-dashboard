package httpcontract

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"k8s.io/apimachinery/pkg/runtime"
)

const maxErrorBody = 1 << 20

// KubernetesResponse preserves caller-visible Kubernetes diagnostics with credential
// redaction. Secret operations and unknown routes retain strict sanitization.
// Resource responses remain untouched; JSON watches adapt only ERROR events.
func KubernetesResponse(resp *http.Response) error {
	if resp.Request != nil {
		CaptureAudit(resp.Request.Context(), resp.Header)
	}
	if resp.StatusCode < http.StatusBadRequest {
		if resp.StatusCode == http.StatusOK && IsWatchRequest(resp.Request) && resp.Body != nil {
			return prepareWatchResponse(resp)
		}
		return nil
	}
	s := ProxyStatus(readKubernetesStatus(resp), resp.StatusCode, resp.Request)
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

// IsWatchRequest recognizes Kubernetes query-based and legacy watch routes.
func IsWatchRequest(r *http.Request) bool {
	if r == nil {
		return false
	}
	path := r.URL.Path
	for _, prefix := range []string{constants.BFFPathPrefix + "/", constants.K8sProxyPrefix} {
		if rest, ok := strings.CutPrefix(path, prefix); ok {
			path = "/" + rest
		}
	}
	segments := strings.Split(strings.TrimPrefix(path, "/"), "/")
	if len(segments) >= 4 && segments[0] == "api" && segments[1] != "" && segments[2] == "watch" && segments[3] != "" {
		return true
	}
	if len(segments) >= 5 && segments[0] == "apis" && segments[1] != "" && segments[2] != "" && segments[3] == "watch" && segments[4] != "" {
		return true
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
