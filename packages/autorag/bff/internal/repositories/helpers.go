package repositories

import (
	"fmt"
	"net/url"
)

// FilterPageValues extracts pagination-related query parameters from URL values
// Returns a new url.Values containing only pageSize, orderBy, sortOrder, and nextPageToken
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

// UrlWithParams appends query parameters to a URL
// Returns the URL with encoded query string, or the original URL if values is empty
func UrlWithParams(url string, values url.Values) string {
	queryString := values.Encode()
	if queryString == "" {
		return url
	}
	return fmt.Sprintf("%s?%s", url, queryString)
}

// UrlWithPageParams appends only pagination-related query parameters to a URL
// Filters values using FilterPageValues before appending to ensure only pagination params are included
func UrlWithPageParams(url string, values url.Values) string {
	pageValues := FilterPageValues(values)
	return UrlWithParams(url, pageValues)
}
