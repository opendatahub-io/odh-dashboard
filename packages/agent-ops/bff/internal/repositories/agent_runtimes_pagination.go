package repositories

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"sort"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const (
	// DefaultAgentRuntimesLimit is the default page size for runtime list queries.
	DefaultAgentRuntimesLimit = 100
	// MaxAgentRuntimesLimit is the maximum page size for runtime list queries.
	MaxAgentRuntimesLimit = 500
)

// NormalizeAgentRuntimesLimit clamps list page sizes to supported bounds.
func NormalizeAgentRuntimesLimit(limit int) int {
	if limit <= 0 {
		return DefaultAgentRuntimesLimit
	}
	if limit > MaxAgentRuntimesLimit {
		return MaxAgentRuntimesLimit
	}
	return limit
}

type agentRuntimesCursor struct {
	Namespace string `json:"namespace"`
	Name      string `json:"name"`
}

func paginateAgentRuntimes(runtimes []models.AgentRuntime, limit int, continueToken string) (*models.AgentRuntimesResponse, error) {
	limit = NormalizeAgentRuntimesLimit(limit)

	sort.Slice(runtimes, func(i, j int) bool {
		return compareAgentRuntimes(runtimes[i], runtimes[j]) < 0
	})

	start, err := startIndexAfterCursor(runtimes, continueToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidContinueToken, err)
	}

	end := start + limit
	hasMore := end < len(runtimes)
	if end > len(runtimes) {
		end = len(runtimes)
	}

	page := runtimes[start:end]
	response := &models.AgentRuntimesResponse{
		Runtimes: page,
	}
	if hasMore && len(page) > 0 {
		last := page[len(page)-1]
		token := encodeAgentRuntimesContinueToken(agentRuntimesCursor{
			Namespace: last.Namespace,
			Name:      last.Name,
		})
		response.ContinueToken = &token
	}

	return response, nil
}

func compareAgentRuntimes(left, right models.AgentRuntime) int {
	if left.Namespace != right.Namespace {
		if left.Namespace < right.Namespace {
			return -1
		}
		return 1
	}
	if left.Name != right.Name {
		if left.Name < right.Name {
			return -1
		}
		return 1
	}
	return 0
}

func startIndexAfterCursor(runtimes []models.AgentRuntime, continueToken string) (int, error) {
	if continueToken == "" {
		return 0, nil
	}

	cursor, err := decodeAgentRuntimesContinueToken(continueToken)
	if err != nil {
		return 0, err
	}

	for i, runtime := range runtimes {
		if compareAgentRuntimes(runtime, cursor) > 0 {
			return i, nil
		}
	}

	return len(runtimes), nil
}

func encodeAgentRuntimesContinueToken(cursor agentRuntimesCursor) string {
	payload, _ := json.Marshal(cursor)
	return base64.RawURLEncoding.EncodeToString(payload)
}

func decodeAgentRuntimesContinueToken(token string) (models.AgentRuntime, error) {
	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return models.AgentRuntime{}, err
	}

	var cursor agentRuntimesCursor
	if err := json.Unmarshal(raw, &cursor); err != nil {
		return models.AgentRuntime{}, err
	}
	if cursor.Namespace == "" || cursor.Name == "" {
		return models.AgentRuntime{}, fmt.Errorf("cursor must include namespace and name")
	}

	return models.AgentRuntime{
		Namespace: cursor.Namespace,
		Name:      cursor.Name,
	}, nil
}
