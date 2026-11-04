package httpcontract

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"strings"
	"testing"
	"testing/iotest"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/require"
)

func resourceWatchEvent(size int, newline bool) string {
	prefix := `{"type":"ADDED","object":{"data":"CANARY_OVERSIZED`
	suffix := `"}}`
	if newline {
		suffix += "\n"
	}
	return prefix + strings.Repeat("x", size-len(prefix)-len(suffix)) + suffix
}

func TestWatchBodyEventLimit(t *testing.T) {
	for _, newline := range []bool{false, true} {
		for _, size := range []int{maxWatchEventBytes - 1, maxWatchEventBytes, maxWatchEventBytes + 1} {
			t.Run(fmt.Sprintf("size=%d/newline=%v", size, newline), func(t *testing.T) {
				event := resourceWatchEvent(size, newline)
				body := newWatchBody(io.NopCloser(strings.NewReader(event)))
				defer body.Close()
				result, err := io.ReadAll(body)
				if size > maxWatchEventBytes {
					require.ErrorIs(t, err, errWatchEventTooLarge)
					require.Empty(t, result, "do not forward any part of an oversized event")
					_, err = body.Read(make([]byte, 1))
					require.ErrorIs(t, err, errWatchEventTooLarge)
					return
				}
				require.NoError(t, err)
				require.True(t, bytes.Equal([]byte(event), result), "preserve resource event bytes")
			})
		}
	}
}

func TestWatchBodyLimitAppliesPerEvent(t *testing.T) {
	event := resourceWatchEvent(maxWatchEventBytes/2+1, true)
	stream := event + event
	body := newWatchBody(io.NopCloser(strings.NewReader(stream)))
	defer body.Close()
	result, err := io.ReadAll(body)
	require.NoError(t, err)
	require.Greater(t, len(result), maxWatchEventBytes)
	require.True(t, bytes.Equal([]byte(stream), result), "retain subsequent buffered events")
}

func TestWatchBodyStopsReadingWhenEventExceedsLimit(t *testing.T) {
	source := &io.LimitedReader{
		R: strings.NewReader(strings.Repeat("x", 2*maxWatchEventBytes)),
		N: 2 * maxWatchEventBytes,
	}
	body := newWatchBody(io.NopCloser(source))
	defer body.Close()
	n, err := body.Read(make([]byte, 1))
	require.Zero(t, n)
	require.ErrorIs(t, err, errWatchEventTooLarge)
	require.Positive(t, source.N, "stop before reading the complete oversized line")
}

func TestWatchBodyPreservesUpstreamReadErrors(t *testing.T) {
	event := resourceWatchEvent(128, true)
	cause := errors.New("upstream interrupted")
	body := newWatchBody(io.NopCloser(io.MultiReader(strings.NewReader(event), iotest.ErrReader(cause))))
	defer body.Close()
	result, err := io.ReadAll(body)
	require.ErrorIs(t, err, cause)
	require.Equal(t, event, string(result))
}

func TestOversizedWatchEventAbortsProxyStreamAndLogsSafely(t *testing.T) {
	first := "{\"type\":\"BOOKMARK\",\"object\":{}}\n"
	oversized := resourceWatchEvent(maxWatchEventBytes+1, true)
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set(constants.HeaderContentType, constants.ContentTypeJSON)
		_, _ = io.WriteString(w, first)
		w.(http.Flusher).Flush()
		_, _ = io.WriteString(w, oversized)
	}))
	defer upstream.Close()
	var logs bytes.Buffer
	logger := slog.New(slog.NewJSONHandler(&logs, nil))
	target, err := url.Parse(upstream.URL)
	require.NoError(t, err)
	proxy := httputil.NewSingleHostReverseProxy(target)
	proxy.Transport = Transport{Base: upstream.Client().Transport, Logger: logger}
	proxy.ModifyResponse = KubernetesResponse
	proxy.ErrorLog = log.New(io.Discard, "", 0)
	server := httptest.NewServer(Middleware(proxy, logger))
	defer server.Close()
	response, err := server.Client().Get(server.URL + "/api/v1/pods?watch=true")
	require.NoError(t, err)
	defer response.Body.Close()
	result, err := io.ReadAll(response.Body)
	server.Close() // Wait for the request's log writes before inspecting the buffer.
	require.ErrorIs(t, err, io.ErrUnexpectedEOF)
	require.Equal(t, http.StatusOK, response.StatusCode)
	require.Equal(t, first, string(result), "do not append an oversized event or JSON error")
	var event struct {
		Code      string `json:"code"`
		RequestID string `json:"request_id"`
	}
	require.NoError(t, json.Unmarshal(logs.Bytes(), &event))
	require.Equal(t, "BAD_GATEWAY", event.Code)
	require.NotEmpty(t, event.RequestID)
	require.Equal(t, response.Header.Get(RequestIDHeader), event.RequestID)
	require.NotContains(t, logs.String(), "CANARY")
}
