package s3

import (
	"bufio"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
)

// ErrInvalidCSV indicates malformed CSV content or exceeded parsing limits rather than a transfer failure.
var ErrInvalidCSV = errors.New("invalid CSV content")

// MaxCSVRowCountBytes bounds the work done for an informational row count.
const MaxCSVRowCountBytes int64 = 32 << 20 // 32 MiB

const maxCSVRecordBytes int64 = 1 << 20 // 1 MiB

// CountCSVRows streams CSV records without retaining the dataset. The header and
// blank lines are excluded, and quoted multiline fields count as a single record.
// Files and logical records exceeding the limits return ErrInvalidCSV without a partial count.
func CountCSVRows(ctx context.Context, r io.Reader) (int64, error) {
	input := &io.LimitedReader{R: r, N: MaxCSVRowCountBytes + 1}
	recordInput := &io.LimitedReader{R: input}
	bufferedInput := bufio.NewReader(recordInput)
	reader := csv.NewReader(bufferedInput)
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1
	reader.ReuseRecord = true
	var records int64
	for {
		// Skip empty physical lines only between records. Newlines inside quoted
		// fields are still read by encoding/csv and count toward the record limit.
		for {
			if err := ctx.Err(); err != nil {
				return 0, err
			}
			recordInput.N = maxCSVRecordBytes + 1
			prefix, peekErr := bufferedInput.Peek(1)
			if peekErr != nil && !errors.Is(peekErr, io.EOF) {
				return 0, fmt.Errorf("error reading CSV: %w", peekErr)
			}
			if len(prefix) == 0 {
				break
			}
			if prefix[0] == '\n' {
				_, _ = bufferedInput.Discard(1)
				continue
			}
			if prefix[0] == '\r' {
				prefix, peekErr = bufferedInput.Peek(2)
				if peekErr != nil && !errors.Is(peekErr, io.EOF) {
					return 0, fmt.Errorf("error reading CSV: %w", peekErr)
				}
				if len(prefix) == 2 && prefix[1] == '\n' {
					_, _ = bufferedInput.Discard(2)
					continue
				}
			}
			break
		}
		if err := ctx.Err(); err != nil {
			return 0, err
		}
		recordStart := reader.InputOffset()
		// encoding/csv may have buffered bytes beyond the previous record. Include
		// those bytes in this record's budget, plus one byte to detect overflow.
		buffered := int64(bufferedInput.Buffered())
		recordInput.N = maxCSVRecordBytes + 1 - buffered
		_, err := reader.Read()
		if input.N == 0 {
			return 0, fmt.Errorf("%w: row counting supports files up to 32 MiB", ErrInvalidCSV)
		}
		if reader.InputOffset()-recordStart > maxCSVRecordBytes {
			return 0, fmt.Errorf("%w: row counting supports CSV records up to 1 MiB", ErrInvalidCSV)
		}
		if errors.Is(err, io.EOF) {
			if records == 0 {
				return 0, nil
			}
			return records - 1, nil
		}
		if err != nil {
			var parseError *csv.ParseError
			if errors.As(err, &parseError) {
				return 0, fmt.Errorf("%w: %w", ErrInvalidCSV, err)
			}
			return 0, fmt.Errorf("error reading CSV: %w", err)
		}
		records++
	}
}
