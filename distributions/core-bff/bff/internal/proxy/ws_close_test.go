package proxy

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/opendatahub-io/odh-dashboard/distributions/core-bff/bff/internal/httpcontract"
	"github.com/stretchr/testify/require"
)

func TestSanitizeCloseCode(t *testing.T) {
	tests := []struct {
		name string
		code int
		want int
	}{
		{"1004 to 1011", 1004, 1011},
		{"1005 to 1011", 1005, 1011},
		{"1006 to 1011", 1006, 1011},
		{"1000 unchanged", 1000, 1000},
		{"1001 unchanged", 1001, 1001},
		{"1011 unchanged", 1011, 1011},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := sanitizeCloseCode(tt.code); got != tt.want {
				t.Errorf("sanitizeCloseCode(%d) = %d, want %d", tt.code, got, tt.want)
			}
		})
	}
}

func TestCloseCodeFromError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want int
	}{
		{
			name: "normal close error",
			err:  &websocket.CloseError{Code: websocket.CloseNormalClosure},
			want: websocket.CloseNormalClosure,
		},
		{
			name: "reserved code 1005 sanitized",
			err:  &websocket.CloseError{Code: 1005},
			want: 1011,
		},
		{
			name: "non-close error defaults to internal server error",
			err:  fmt.Errorf("connection reset"),
			want: websocket.CloseInternalServerErr,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := closeCodeFromError(tt.err)
			if got != tt.want {
				t.Errorf("closeCodeFromError() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestWebSocketCloseContract(t *testing.T) {
	for _, code := range []int{1000, 1008, 1011, 1001, 1006} {
		t.Run(fmt.Sprint(code), func(t *testing.T) {
			shutdown := code == 1001
			upstreamClose := make(chan *websocket.CloseError, 1)
			backend := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				upgrader := newUpgrader([]string{"*"})
				c, err := upgrader.Upgrade(w, r, nil)
				if err != nil {
					return
				}
				defer c.Close()
				if !shutdown {
					_ = c.WriteControl(websocket.CloseMessage, websocket.FormatCloseMessage(code, "CANARY_SECRET"), time.Now().Add(time.Second))
				}
				_ = c.SetReadDeadline(time.Now().Add(5 * time.Second))
				_, _, err = c.ReadMessage()
				if ce, ok := err.(*websocket.CloseError); ok {
					upstreamClose <- ce
				}
			}))
			defer backend.Close()
			tracker := NewConnectionTracker(testLogger())
			handler, err := NewWsProxyHandler(testWsConfig(backend.URL, tracker))
			require.NoError(t, err)
			server := httptest.NewServer(httpcontract.Middleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				handler.ServeHTTP(w, r.WithContext(identityContext(r, "CANARY_TOKEN")))
			})))
			defer server.Close()
			c, resp, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/wss/k8s/api/v1/pods", nil)
			require.NoError(t, err)
			defer c.Close()
			require.NotEmpty(t, resp.Header.Get(httpcontract.RequestIDHeader))
			if shutdown {
				require.Eventually(t, func() bool { return tracker.ActiveCount() == 1 }, time.Second, time.Millisecond)
				tracker.Stop()
			}
			_ = c.SetReadDeadline(time.Now().Add(5 * time.Second))
			_, _, err = c.ReadMessage()
			var ce *websocket.CloseError
			require.ErrorAs(t, err, &ce)
			wantCode := code
			if code == 1006 {
				wantCode = 1011
			}
			require.Equal(t, wantCode, ce.Code)
			require.NotContains(t, ce.Text, "CANARY")
			require.LessOrEqual(t, len([]byte(ce.Text)), 123)
			if !shutdown {
				if code != 1006 {
					select {
					case closeError := <-upstreamClose:
						require.NotContains(t, closeError.Text, "CANARY")
					case <-time.After(5 * time.Second):
						t.Fatal("upstream close acknowledgement was not received")
					}
				}
				tracker.Stop()
			}
		})
	}
	for _, invalid := range []int{0, 999, 1004, 1005, 1006, 1015, 2000, 5000} {
		require.Equal(t, 1011, sanitizeCloseCode(invalid))
	}
}
