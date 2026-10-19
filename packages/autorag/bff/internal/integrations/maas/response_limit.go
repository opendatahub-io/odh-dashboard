package maas

import (
	"context"
	"io"
	"net/http"
)

// maxMaaSResponseBodyBytes is enforced before the OpenAI SDK can parse any
// embedding or chat response. It also bounds each streaming HTTP response.
const maxMaaSResponseBodyBytes = 4 << 20

type limitedResponseBodyRoundTripper struct {
	base http.RoundTripper
}

func limitMaaSResponseBody(rt http.RoundTripper) http.RoundTripper {
	if rt == nil {
		rt = http.DefaultTransport
	}
	if _, alreadyLimited := rt.(*limitedResponseBodyRoundTripper); alreadyLimited {
		return rt
	}
	return &limitedResponseBodyRoundTripper{base: rt}
}

func (t *limitedResponseBodyRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	ctx, cancel := context.WithCancel(req.Context())
	resp, err := t.base.RoundTrip(req.WithContext(ctx))
	if err != nil {
		cancel()
		return nil, err
	}
	if resp.Body == nil {
		cancel()
		return resp, nil
	}
	resp.Body = &limitedResponseBody{
		ReadCloser: resp.Body,
		remaining:  maxMaaSResponseBodyBytes,
		cancel:     cancel,
	}
	return resp, nil
}

type limitedResponseBody struct {
	io.ReadCloser
	remaining int
	cancel    context.CancelFunc
}

func (b *limitedResponseBody) Read(p []byte) (int, error) {
	if len(p) == 0 {
		return 0, nil
	}
	if b.remaining == 0 {
		var probe [1]byte
		n, err := b.ReadCloser.Read(probe[:])
		if n > 0 {
			b.cancel()
			return 0, ErrMaaSResponseBodyLimit
		}
		return 0, err
	}
	if len(p) > b.remaining {
		p = p[:b.remaining]
	}
	n, err := b.ReadCloser.Read(p)
	b.remaining -= n
	return n, err
}

func (b *limitedResponseBody) Close() error {
	b.cancel()
	return b.ReadCloser.Close()
}
