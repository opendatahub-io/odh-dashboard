package controller

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestMinNonZeroDuration(t *testing.T) {
	for _, tt := range []struct {
		name      string
		durations []time.Duration
		want      time.Duration
	}{
		{name: "no retry requested"},
		{name: "all retries disabled", durations: []time.Duration{0, 0, 0}},
		{name: "ignores non-positive durations", durations: []time.Duration{-time.Second, 0, time.Minute}, want: time.Minute},
		{name: "portal is the only retry", durations: []time.Duration{time.Minute, 0}, want: time.Minute},
		{name: "observability is the only retry", durations: []time.Duration{0, 5 * time.Minute}, want: 5 * time.Minute},
		{name: "portal retries first", durations: []time.Duration{time.Minute, 5 * time.Minute}, want: time.Minute},
		{name: "observability retries first", durations: []time.Duration{5 * time.Minute, time.Minute}, want: time.Minute},
		{name: "existing requeue takes precedence", durations: []time.Duration{10 * time.Second, time.Minute, 5 * time.Minute}, want: 10 * time.Second},
		{name: "operand retry shortens periodic requeue", durations: []time.Duration{10 * time.Minute, 5 * time.Minute, time.Minute}, want: time.Minute},
		{name: "equal retries", durations: []time.Duration{time.Minute, time.Minute}, want: time.Minute},
	} {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, minNonZeroDuration(tt.durations...))
		})
	}
}
