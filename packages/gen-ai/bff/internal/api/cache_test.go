package api

import "testing"

func TestIsHashedAsset(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"hashed JS bundle", "app.a1b2c3d4e5f6.bundle.js", true},
		{"hashed CSS", "app.1234abcd5678.css", true},
		{"chunkhash JS", "1013-4cee0676a66ac829f875.js", true},
		{"hashed chunk CSS", "some-chunk.abcdef01.bundle.css", true},
		{"index.html", "index.html", false},
		{"favicon", "favicon.ico", false},
		{"remoteEntry", "remoteEntry.js", false},
		{"manifest", "manifest.json", false},
		{"image", "images/logo.png", false},
		{"font", "fonts/RedHatDisplay.woff2", false},
		{"non-hashed bundle", "app.bundle.js", false},
		{"non-hashed CSS", "app.css", false},
		{"numeric suffix image", "images/logo-20240608.png", false},
		{"numeric suffix font", "fonts/asset-20240608.woff2", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isHashedAsset(tt.path); got != tt.expected {
				t.Errorf("isHashedAsset(%q) = %v, want %v", tt.path, got, tt.expected)
			}
		})
	}
}

func TestIsStaticAsset(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected bool
	}{
		{"ico", "favicon.ico", true},
		{"png", "images/logo.png", true},
		{"jpg", "images/photo.jpg", true},
		{"jpeg", "images/photo.jpeg", true},
		{"svg", "images/icon.svg", true},
		{"gif", "images/anim.gif", true},
		{"webp", "images/banner.webp", true},
		{"woff2", "fonts/RedHatDisplay.woff2", true},
		{"woff", "fonts/RedHatText.woff", true},
		{"ttf", "fonts/mono.ttf", true},
		{"eot", "fonts/legacy.eot", true},
		{"JS file", "app.bundle.js", false},
		{"CSS file", "app.css", false},
		{"HTML file", "index.html", false},
		{"JSON file", "manifest.json", false},
		{"locale JSON", "locales/en/translation.json", false},
		{"remoteEntry", "remoteEntry.js", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isStaticAsset(tt.path); got != tt.expected {
				t.Errorf("isStaticAsset(%q) = %v, want %v", tt.path, got, tt.expected)
			}
		})
	}
}

func TestCacheControlForStaticFile(t *testing.T) {
	tests := []struct {
		name     string
		path     string
		expected string
	}{
		{"hashed JS", "app.a1b2c3d4.bundle.js", "public, max-age=31536000, immutable"},
		{"favicon", "favicon.ico", "public, max-age=86400"},
		{"font", "fonts/RedHatDisplay.woff2", "public, max-age=86400"},
		{"image", "images/logo.png", "public, max-age=86400"},
		{"numeric suffix image", "images/logo-20240608.png", "public, max-age=86400"},
		{"numeric suffix font", "fonts/asset-20240608.woff2", "public, max-age=86400"},
		{"remoteEntry", "remoteEntry.js", "no-cache"},
		{"locale JSON", "locales/en/translation.json", "no-cache"},
		{"manifest", "manifest.json", "no-cache"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := cacheControlForStaticFile(tt.path); got != tt.expected {
				t.Errorf("cacheControlForStaticFile(%q) = %q, want %q", tt.path, got, tt.expected)
			}
		})
	}
}
