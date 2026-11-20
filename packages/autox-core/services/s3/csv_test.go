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

func TestCountCSVRows_RecordLimit(t *testing.T) {
	for _, tc := range []struct {
		name string
		csv  string
	}{
		{name: "single line", csv: strings.Repeat("a", int(maxCSVRecordBytes)) + "\n"},
		{name: "multiline", csv: "\"" + strings.Repeat("a\n", int(maxCSVRecordBytes/2)) + "\"\n"},
		{name: "unterminated multiline", csv: "\"" + strings.Repeat("a\n", int(maxCSVRecordBytes/2))},
	} {
		t.Run(tc.name, func(t *testing.T) {
			// An ordinary prefix exercises buffered read-ahead and ensures a partial
			// count is never returned when an oversized record appears later.
			input := "name\n" + strings.Repeat("small\n", 100) + tc.csv
			count, err := CountCSVRows(context.Background(), strings.NewReader(input))
			if count != 0 || !errors.Is(err, ErrInvalidCSV) || !strings.Contains(err.Error(), "records up to 1 MiB") {
				t.Fatalf("expected a record-limit error without a partial count, got %d, %v", count, err)
			}
		})
	}
}

func TestCountCSVRows_RecordAtLimit(t *testing.T) {
	input := "name\nshort\n" + strings.Repeat("a", int(maxCSVRecordBytes)-1) + "\nlast\n"
	count, err := CountCSVRows(context.Background(), strings.NewReader(input))
	if err != nil || count != 3 {
		t.Fatalf("expected three rows including a record at the limit, got %d, %v", count, err)
	}
}

func TestCountCSVRows_FileLimit(t *testing.T) {
	row := strings.Repeat("a", 1023) + "\n"
	input := strings.Repeat(row, int(MaxCSVRowCountBytes/1024))
	t.Run("exact limit", func(t *testing.T) {
		count, err := CountCSVRows(context.Background(), strings.NewReader(input))
		if err != nil || count != MaxCSVRowCountBytes/1024-1 {
			t.Fatalf("expected a complete count at the file limit, got %d, %v", count, err)
		}
	})
	t.Run("over limit", func(t *testing.T) {
		count, err := CountCSVRows(context.Background(), io.MultiReader(strings.NewReader(input), strings.NewReader("a")))
		if count != 0 || !errors.Is(err, ErrInvalidCSV) || !strings.Contains(err.Error(), "files up to 32 MiB") {
			t.Fatalf("expected a file-limit error without a partial count, got %d, %v", count, err)
		}
	})
}
