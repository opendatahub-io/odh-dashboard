package repositories

import (
	"testing"
	"time"
)

func TestFormatKuadrantDurationWindow(t *testing.T) {
	t.Parallel()
	cases := []struct {
		d    time.Duration
		want string
	}{
		{time.Hour, "1h"},
		{2 * time.Hour, "2h"},
		{time.Minute, "1m"},
		{90 * time.Minute, "1h30m"},
		{time.Second, "1s"},
		{500 * time.Millisecond, "500ms"},
	}
	for _, tc := range cases {
		if got := formatKuadrantDurationWindow(tc.d); got != tc.want {
			t.Fatalf("formatKuadrantDurationWindow(%v) = %q, want %q", tc.d, got, tc.want)
		}
	}
}
