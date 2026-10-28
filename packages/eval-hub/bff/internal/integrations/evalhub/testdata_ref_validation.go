package evalhub

import (
	"fmt"
	"net/url"
	"strings"
)

// Validate checks that a benchmark's test data reference is well formed. A nil
// reference is valid and means no test data override is supplied. A present
// reference must set exactly one of the s3, pvc, git, or hf variants. Git
// references must point at credential-free HTTP(S) URLs and must use HTTPS
// whenever a secret reference is supplied, so credentials are never sent over
// plaintext. Relative paths (s3 key, sub_path) must stay within the test data
// root: absolute paths and ".." segments are rejected.
func (r *TestDataRef) Validate() error {
	if r == nil {
		return nil
	}

	var variants []string
	if r.S3 != nil {
		variants = append(variants, "s3")
	}
	if r.PVC != nil {
		variants = append(variants, "pvc")
	}
	if r.Git != nil {
		variants = append(variants, "git")
	}
	if r.HF != nil {
		variants = append(variants, "hf")
	}
	if len(variants) != 1 {
		return fmt.Errorf("test_data_ref must specify exactly one of s3, pvc, git, or hf, got: %s", strings.Join(variants, ", "))
	}

	if r.S3 != nil {
		return validateRelativePath("s3 test data key", r.S3.Key)
	}
	if r.PVC != nil {
		return validateRelativePath("pvc test data sub_path", r.PVC.SubPath)
	}
	if r.Git != nil {
		return r.Git.validate()
	}
	return validateRelativePath("hf test data sub_path", r.HF.SubPath)
}

func (g *TestDataRefGit) validate() error {
	parsed, err := url.Parse(g.URL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("git test data url must be a valid http(s) url, got %q", g.URL)
	}
	if parsed.User != nil {
		return fmt.Errorf("git test data url must not embed credentials, got %q", g.URL)
	}
	if g.SecretRef != "" && parsed.Scheme != "https" {
		return fmt.Errorf("git test data url must use https when a secret reference is provided, got %q", g.URL)
	}
	return validateRelativePath("git test data sub_path", g.SubPath)
}

// validateRelativePath rejects empty-safe relative paths that are absolute or
// contain ".." segments, so the value cannot traverse outside the intended
// test data root when the job's init container resolves it.
func validateRelativePath(field, value string) error {
	if value == "" {
		return nil
	}
	trimmed := strings.TrimSpace(value)
	if strings.HasPrefix(trimmed, "/") {
		return fmt.Errorf("%s must not start with a slash, got %q", field, value)
	}
	for _, segment := range strings.FieldsFunc(trimmed, func(r rune) bool { return r == '/' || r == '\\' }) {
		if segment == ".." {
			return fmt.Errorf("%s must not contain \"..\" segments, got %q", field, value)
		}
	}
	return nil
}
