package httpcontract

import (
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	"github.com/stretchr/testify/require"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
)

func TestInvalidErrorRepresentationsUseSafeFallback(t *testing.T) {
	compress := func(body, comment string) []byte {
		var encoded bytes.Buffer
		writer := gzip.NewWriter(&encoded)
		writer.Comment = comment
		_, err := io.WriteString(writer, body)
		require.NoError(t, err)
		require.NoError(t, writer.Close())
		return encoded.Bytes()
	}
	status := `{"reason":"AlreadyExists","message":"CANARY_SECRET"}`
	validGzip := compress(status, "")
	corruptGzip := bytes.Clone(validGzip)
	corruptGzip[len(corruptGzip)-1] ^= 1
	for _, tc := range []struct {
		name, encoding, mediaType string
		body                      []byte
	}{
		{name: "invalid gzip header", encoding: constants.ContentEncodingGzip, body: []byte("CANARY_SECRET")},
		{name: "truncated gzip", encoding: constants.ContentEncodingGzip, body: validGzip[:len(validGzip)-4]},
		{name: "invalid gzip checksum", encoding: constants.ContentEncodingGzip, body: corruptGzip},
		{name: "unsupported encoding", encoding: "br", body: []byte(status)},
		{name: "invalid protobuf", mediaType: runtime.ContentTypeProtobuf, body: []byte(status)},
		{name: "truncated JSON", body: []byte(status[:len(status)-1])},
		{name: "oversized body", body: []byte(status + strings.Repeat(" ", maxErrorBody))},
		{name: "oversized decompressed body", encoding: constants.ContentEncodingGzip, body: compress(status+strings.Repeat(" ", maxErrorBody), "")},
		{name: "oversized wire header", encoding: constants.ContentEncodingGzip, body: compress(status, strings.Repeat("x", maxErrorBody+100))},
	} {
		t.Run(tc.name, func(t *testing.T) {
			source := &io.LimitedReader{R: bytes.NewReader(tc.body), N: int64(len(tc.body))}
			response := &http.Response{StatusCode: http.StatusConflict, Header: make(http.Header), Body: io.NopCloser(source)}
			response.Header.Set(constants.HeaderContentEncoding, tc.encoding)
			response.Header.Set(constants.HeaderContentType, tc.mediaType)
			require.NoError(t, KubernetesResponse(response))
			body, err := io.ReadAll(response.Body)
			require.NoError(t, err)
			var got metav1.Status
			require.NoError(t, json.Unmarshal(body, &got))
			require.Equal(t, metav1.StatusReasonConflict, got.Reason)
			require.Nil(t, got.Details)
			require.NotContains(t, string(body), "CANARY")
			require.Empty(t, response.Header.Get(constants.HeaderContentEncoding))
			if len(tc.body) > maxErrorBody+1 {
				require.Positive(t, source.N, "stop before reading an oversized wire body in full")
			}
		})
	}
}
