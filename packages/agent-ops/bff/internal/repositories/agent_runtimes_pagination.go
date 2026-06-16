package repositories

import (
	"encoding/base64"
	"fmt"
	"sort"
	"strconv"

	"github.com/opendatahub-io/mod-arch-library/bff/internal/models"
)

const (
	defaultAgentRuntimesLimit = 100
	maxAgentRuntimesLimit     = 500
)

func normalizeAgentRuntimesLimit(limit int) int {
	if limit <= 0 {
		return defaultAgentRuntimesLimit
	}
	if limit > maxAgentRuntimesLimit {
		return maxAgentRuntimesLimit
	}
	return limit
}

func paginateAgentRuntimes(runtimes []models.AgentRuntime, limit int, continueToken string) (*models.AgentRuntimesResponse, error) {
	limit = normalizeAgentRuntimesLimit(limit)

	offset, err := decodeAgentRuntimesContinueToken(continueToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %w", ErrInvalidContinueToken, err)
	}

	sort.Slice(runtimes, func(i, j int) bool {
		if runtimes[i].Namespace != runtimes[j].Namespace {
			return runtimes[i].Namespace < runtimes[j].Namespace
		}
		return runtimes[i].Name < runtimes[j].Name
	})

	if offset > len(runtimes) {
		offset = len(runtimes)
	}

	end := offset + limit
	hasMore := end < len(runtimes)
	if end > len(runtimes) {
		end = len(runtimes)
	}

	page := runtimes[offset:end]
	response := &models.AgentRuntimesResponse{
		Runtimes: page,
	}
	if hasMore {
		token := encodeAgentRuntimesContinueToken(end)
		response.ContinueToken = &token
	}

	return response, nil
}

func encodeAgentRuntimesContinueToken(offset int) string {
	return base64.RawURLEncoding.EncodeToString([]byte(strconv.Itoa(offset)))
}

func decodeAgentRuntimesContinueToken(token string) (int, error) {
	if token == "" {
		return 0, nil
	}

	raw, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return 0, err
	}

	offset, err := strconv.Atoi(string(raw))
	if err != nil || offset < 0 {
		return 0, fmt.Errorf("invalid offset")
	}

	return offset, nil
}
