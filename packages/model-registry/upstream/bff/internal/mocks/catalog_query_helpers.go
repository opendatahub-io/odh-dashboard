package mocks

import (
	"math"
	"net/http"
	"net/url"
	"regexp"
	"slices"
	"strconv"
	"strings"

	"github.com/kubeflow/hub/ui/bff/internal/integrations/httpclient"
)

// Existing catalog mocks ignore malformed input; runtime mocks reject it.
type catalogMockQueryMode bool

const (
	permissiveCatalogMockQuery catalogMockQueryMode = false
	strictCatalogMockQuery     catalogMockQueryMode = true
)

var catalogMockFilterPattern = regexp.MustCompile(`^([a-zA-Z][a-zA-Z0-9_.]*)\s*(?:=\s*'([^']*)'|IN\s*\(('(?:[^']*)'(?:\s*,\s*'[^']*')*)\))$`)

func parseCatalogMockFilter(clause string, mode catalogMockQueryMode, keys []string) (string, []string, error) {
	clause = strings.TrimSpace(clause)
	if mode == strictCatalogMockQuery {
		match := catalogMockFilterPattern.FindStringSubmatch(clause)
		if match == nil {
			return "", nil, catalogMockError(http.StatusBadRequest, "mock filterQuery supports equality and IN clauses joined by AND")
		}
		if !slices.Contains(keys, match[1]) {
			return "", nil, catalogMockError(http.StatusBadRequest, "unsupported mock filter field: "+match[1])
		}
		if match[3] == "" {
			return match[1], []string{match[2]}, nil
		}
		return match[1], catalogMockFilterValues(match[3]), nil
	}
	if idx := strings.Index(clause, " IN ("); idx != -1 {
		return strings.TrimSpace(clause[:idx]), catalogMockFilterValues(strings.TrimSuffix(clause[idx+5:], ")")), nil
	}
	if idx := strings.Index(clause, "="); idx != -1 {
		return strings.TrimSpace(clause[:idx]), []string{strings.Trim(strings.TrimSpace(clause[idx+1:]), "'")}, nil
	}
	return "", nil, nil
}

func catalogMockFilterValues(value string) []string {
	var values []string
	for _, part := range strings.Split(value, ",") {
		values = append(values, strings.Trim(strings.TrimSpace(part), "'"))
	}
	return values
}

func filterCatalogMockItems[T any](items []T, query string, mode catalogMockQueryMode, keys []string, matches func(T, string, []string) bool) ([]T, error) {
	if query == "" {
		return items, nil
	}
	for _, clause := range strings.Split(query, " AND ") {
		key, values, err := parseCatalogMockFilter(clause, mode, keys)
		if err != nil {
			return nil, err
		}
		if key == "" && values == nil {
			continue
		}
		var filtered []T
		for _, item := range items {
			if matches(item, key, values) {
				filtered = append(filtered, item)
			}
		}
		items = filtered
	}
	return items, nil
}

func pageCatalogMockItems[T any](items []T, query url.Values, mode catalogMockQueryMode) ([]T, string, int32, error) {
	pageSize := int64(10)
	if raw := query.Get("pageSize"); raw != "" {
		bits := 64
		if mode == strictCatalogMockQuery {
			bits = 32
		}
		parsed, err := strconv.ParseInt(raw, 10, bits)
		if err == nil && parsed > 0 {
			pageSize = parsed
		} else if mode == strictCatalogMockQuery {
			return nil, "", 0, catalogMockError(http.StatusBadRequest, "pageSize must be a positive int32")
		}
	}
	start := int64(0)
	if raw := query.Get("nextPageToken"); raw != "" {
		parsed, err := strconv.ParseInt(raw, 10, 64)
		if err == nil && parsed >= 0 {
			start = parsed
		} else if mode == strictCatalogMockQuery {
			return nil, "", 0, catalogMockError(http.StatusBadRequest, "invalid nextPageToken")
		}
	}
	total := int64(len(items))
	start = min(start, total)
	end := start + min(pageSize, total-start)
	token := ""
	if end < total {
		token = strconv.FormatInt(end, 10)
	}
	page := items[start:end]
	if len(page) == 0 {
		page = []T{}
	}
	return page, token, int32(min(pageSize, math.MaxInt32)), nil
}

func catalogMockError(status int, message string) error {
	return &httpclient.HTTPError{StatusCode: status, ErrorResponse: httpclient.ErrorResponse{Code: strconv.Itoa(status), Message: message}}
}
