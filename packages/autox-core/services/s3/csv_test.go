package s3

import (
	"context"
	"errors"
	"io"
	"strings"
	"testing"
)

func TestCountCSVRows(t *testing.T) {
	for _, tc := range []struct {
		name string
		csv  string
		want int64
	}{
		{name: "empty"},
		{name: "header only", csv: "name,value\n"},
		{name: "no trailing newline", csv: "name,value\na,1", want: 1},
		{name: "beyond schema sample", csv: "name,value\n" + strings.Repeat("a,1\n", 144), want: 144},
		{name: "quoted multiline and commas", csv: "name,value\n\"a,b\",1\n\"two\nlines\",2\n", want: 2},
		{name: "blank lines and CRLF", csv: "name,value\r\n\r\na,1\r\n\r\nb,2\r\n", want: 2},
		{name: "different field counts", csv: "name,value\na\nb,1,2\n", want: 2},
	} {
		t.Run(tc.name, func(t *testing.T) {
			got, err := CountCSVRows(context.Background(), strings.NewReader(tc.csv))
			if err != nil || got != tc.want {
				t.Fatalf("CountCSVRows() = %d, %v; want %d, nil", got, err, tc.want)
			}
		})
	}
}

type failingCSVReader struct{}

func (failingCSVReader) Read([]byte) (int, error) { return 0, io.ErrUnexpectedEOF }

func TestCountCSVRows_ReadFailure(t *testing.T) {
	input := io.MultiReader(strings.NewReader("name,value\na,1\n"), failingCSVReader{})
	count, err := CountCSVRows(context.Background(), input)
	if !errors.Is(err, io.ErrUnexpectedEOF) || count != 0 {
		t.Fatalf("expected transfer error without a partial count, got %d, %v", count, err)
	}
}

func TestCountCSVRows_Cancellation(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := CountCSVRows(ctx, strings.NewReader("name,value\na,1\n"))
	if !errors.Is(err, context.Canceled) {
		t.Fatalf("expected cancellation, got %v", err)
	}
}
