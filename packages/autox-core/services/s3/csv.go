package s3

import (
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
)

// ErrInvalidCSV indicates malformed CSV content rather than a transfer failure.
var ErrInvalidCSV = errors.New("invalid CSV content")

// CountCSVRows streams CSV records without retaining the dataset. The header and
// blank lines are excluded, and quoted multiline fields count as a single record.
func CountCSVRows(ctx context.Context, r io.Reader) (int64, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.LazyQuotes = true
	reader.FieldsPerRecord = -1
	reader.ReuseRecord = true
	var records int64
	for {
		if err := ctx.Err(); err != nil {
			return 0, err
		}
		_, err := reader.Read()
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
