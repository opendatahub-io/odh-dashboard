package repositories

import (
	"fmt"
	"net/url"
	"strings"
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
// Properly handles URLs that already contain query strings or fragments
func UrlWithParams(url string, values url.Values) string {
	queryString := values.Encode()
	if queryString == "" {
		return url
	}

	// Check if URL contains a fragment
	if fragmentIndex := strings.Index(url, "#"); fragmentIndex != -1 {
		// Split URL at fragment to insert query params before it
		baseURL := url[:fragmentIndex]
		fragment := url[fragmentIndex:]

		// Determine separator based on whether baseURL already has query params
		separator := "?"
		if strings.Contains(baseURL, "?") {
			separator = "&"
		}

		return fmt.Sprintf("%s%s%s%s", baseURL, separator, queryString, fragment)
	}

	// No fragment - check if URL already has query params
	separator := "?"
	if strings.Contains(url, "?") {
		separator = "&"
	}

	return fmt.Sprintf("%s%s%s", url, separator, queryString)
}

// UrlWithPageParams appends only pagination-related query parameters to a URL
// Filters values using FilterPageValues before appending to ensure only pagination params are included
func UrlWithPageParams(url string, values url.Values) string {
	pageValues := FilterPageValues(values)
	return UrlWithParams(url, pageValues)
}
