package repositories

import (
	"fmt"
	"net/url"
)

// FilterPageValues extracts pagination-related query parameters from URL values.
func FilterPageValues(values url.Values) url.Values {
	result := url.Values{}

	if v := values.Get("pageSize"); v != "" {
		result.Set("pageSize", v)
	}
	if v := values.Get("orderBy"); v != "" {
		result.Set("orderBy", v)
	}
	if v := values.Get("sortOrder"); v != "" {
		result.Set("sortOrder", v)
	}
	if v := values.Get("nextPageToken"); v != "" {
		result.Set("nextPageToken", v)
	}

	return result
}

// URLWithParams appends query parameters to a URL string.
func URLWithParams(url string, values url.Values) string {
	queryString := values.Encode()
	if queryString == "" {
		return url
	}
	return fmt.Sprintf("%s?%s", url, queryString)
}

// URLWithPageParams appends only pagination-related query parameters to a URL string.
func URLWithPageParams(url string, values url.Values) string {
	pageValues := FilterPageValues(values)
	return URLWithParams(url, pageValues)
}
