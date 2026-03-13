package llamastack

import (
	"github.com/openai/openai-go/v2/responses"
)

// ResponseStreamIterator abstracts over streaming response sources.
// Both the real ssestream.Stream and mock implementations satisfy this interface.
// The real *ssestream.Stream[responses.ResponseStreamEventUnion] already has all
// four methods, so it satisfies this interface via Go structural typing.
type ResponseStreamIterator interface {
	// Next advances to the next event. Returns false when the stream is exhausted or an error occurred.
	Next() bool
	// Current returns the current event. Only valid after Next() returns true.
	Current() responses.ResponseStreamEventUnion
	// Err returns any error encountered during streaming.
	Err() error
	// Close releases resources associated with the stream.
	Close() error
}
