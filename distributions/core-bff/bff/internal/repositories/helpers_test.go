package repositories

import (
	"net/url"
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestURLWithParams_NoExistingQuery(t *testing.T) {
	result := URLWithParams("http://host/path", url.Values{"key": {"val"}})
	assert.Contains(t, result, "key=val")
	assert.Equal(t, 1, countChar(result, '?'))
}

func TestURLWithParams_MergesWithExistingQuery(t *testing.T) {
	result := URLWithParams("http://host/path?existing=1", url.Values{"new": {"2"}})
	assert.Contains(t, result, "existing=1")
	assert.Contains(t, result, "new=2")
	assert.Equal(t, 1, countChar(result, '?'))
}

func TestURLWithParams_EmptyValues(t *testing.T) {
	result := URLWithParams("http://host/path", url.Values{})
	assert.Equal(t, "http://host/path", result)
}

func TestURLWithParams_InvalidURL(t *testing.T) {
	result := URLWithParams("://bad", url.Values{"k": {"v"}})
	assert.Equal(t, "://bad", result)
}

func TestURLWithParams_NilValues(t *testing.T) {
	result := URLWithParams("http://host/path?a=1", nil)
	assert.Equal(t, "http://host/path?a=1", result)
}

func TestURLWithPageParams_FiltersToPageKeys(t *testing.T) {
	values := url.Values{
		"pageSize":      {"10"},
		"orderBy":       {"name"},
		"unrelatedKey":  {"drop-me"},
		"nextPageToken": {"abc"},
	}
	result := URLWithPageParams("http://host/path", values)
	assert.Contains(t, result, "pageSize=10")
	assert.Contains(t, result, "orderBy=name")
	assert.Contains(t, result, "nextPageToken=abc")
	assert.NotContains(t, result, "unrelatedKey")
}

func countChar(s string, c rune) int {
	n := 0
	for _, ch := range s {
		if ch == c {
			n++
		}
	}
	return n
}
