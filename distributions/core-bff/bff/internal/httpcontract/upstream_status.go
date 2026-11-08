package httpcontract

import (
	"compress/gzip"
	"encoding/json"
	"io"
	"mime"
	"net/http"
	"strings"

	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/constants"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	"k8s.io/apimachinery/pkg/runtime/serializer/protobuf"
)

var statusProtobufDecoder = func() runtime.Decoder {
	statusScheme := runtime.NewScheme()
	statusScheme.AddUnversionedTypes(schema.GroupVersion{Version: "v1"}, &metav1.Status{})
	return protobuf.NewSerializer(statusScheme, statusScheme)
}()

// readKubernetesStatus bounds both wire bytes and decompressed bytes. Unsupported,
// malformed or oversized bodies use the same safe status-based fallback.
func readKubernetesStatus(resp *http.Response) metav1.Status {
	if resp.Body == nil {
		return metav1.Status{}
	}
	defer resp.Body.Close()
	wire := &io.LimitedReader{R: resp.Body, N: maxErrorBody + 1}
	var reader io.Reader = wire
	switch strings.ToLower(strings.TrimSpace(resp.Header.Get(constants.HeaderContentEncoding))) {
	case "", "identity":
	case constants.ContentEncodingGzip:
		decoded, err := gzip.NewReader(wire)
		if err != nil {
			return metav1.Status{}
		}
		defer decoded.Close()
		reader = decoded
	default:
		return metav1.Status{}
	}
	body, err := io.ReadAll(io.LimitReader(reader, maxErrorBody+1))
	if err != nil || len(body) > maxErrorBody || wire.N == 0 {
		return metav1.Status{}
	}
	var status metav1.Status
	mediaType, _, _ := mime.ParseMediaType(resp.Header.Get(constants.HeaderContentType))
	if mediaType == runtime.ContentTypeProtobuf {
		_, _, err = statusProtobufDecoder.Decode(body, nil, &status)
	} else {
		err = json.Unmarshal(body, &status)
	}
	if err != nil {
		return metav1.Status{}
	}
	return status
}
