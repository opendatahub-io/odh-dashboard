package evalhub

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"
)

// Matches the upstream Eval Hub contract for PVC claim_name: an RFC 1123 DNS
// label (lowercase alphanumeric with internal hyphens), max 63 characters.
var claimNamePattern = regexp.MustCompile(`^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$`)

// TestDataRefType values mirror the TestDataRefType enum in the OpenAPI spec.
const (
	TestDataRefTypeDataSet         = "data_set"
	TestDataRefTypePreRecordedData = "pre_recorded_data"
)

// Validate checks that a benchmark's test data reference is well formed. A nil
// reference is valid and means no test data override is supplied. A present
// reference must set exactly one of the s3, pvc, git, or hf variants, and each
// variant must carry its identifying field (pvc claim_name, git ref, hf
// repo_id). PVC claim names must be RFC 1123 DNS labels (lowercase
// alphanumeric with internal hyphens, max 63 characters), matching the
// upstream Eval Hub contract. Git references must
// point at credential-free HTTP(S) URLs and must
// use HTTPS whenever a secret reference is supplied, so credentials are never
// sent over plaintext. A non-empty type must be one of the TestDataRefType
// enum values. Relative paths (s3 key, sub_path) must stay within the test data
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

	if err := validateTestDataRefType("test_data_ref", r.Type); err != nil {
		return err
	}

	if r.S3 != nil {
		// Bucket and secret_ref emptiness are deliberately not enforced here:
		// the upstream service owns the required-field contract and rejects
		// incomplete refs itself. The collection reconfigure path forwards
		// stored s3 refs verbatim (the benchmark path re-serializes them into
		// the split shape), so enforcing here would only duplicate the
		// upstream error. Only the key's path shape is checked.
		return validateRelativePath("s3 test data key", r.S3.Key)
	}
	if r.PVC != nil {
		claimName := strings.TrimSpace(r.PVC.ClaimName)
		if claimName == "" {
			return fmt.Errorf("pvc test data claim_name must not be empty")
		}
		if len(claimName) > 63 {
			return fmt.Errorf("pvc test data claim_name must be at most 63 characters, got %d", len(claimName))
		}
		if !claimNamePattern.MatchString(claimName) {
			return fmt.Errorf("pvc test data claim_name must be an RFC 1123 DNS label (lowercase alphanumeric and hyphens), got %q", claimName)
		}
		return validateRelativePath("pvc test data sub_path", r.PVC.SubPath)
	}
	if r.Git != nil {
		return r.Git.validate()
	}
	if strings.TrimSpace(r.HF.RepoID) == "" {
		return fmt.Errorf("hf test data repo_id must not be empty")
	}
	return validateRelativePath("hf test data sub_path", r.HF.SubPath)
}

func (g *TestDataRefGit) validate() error {
	parsed, err := url.Parse(g.URL)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return fmt.Errorf("git test data url must be a valid http(s) url")
	}
	if parsed.User != nil {
		// Do not echo the raw URL here: it may embed credentials.
		return fmt.Errorf("git test data url must not embed credentials")
	}
	if g.SecretRef != "" && parsed.Scheme != "https" {
		return fmt.Errorf("git test data url must use https when a secret reference is provided, got %q", g.URL)
	}
	if strings.TrimSpace(g.Ref) == "" {
		return fmt.Errorf("git test data ref must not be empty")
	}
	if err := validateRelativePath("git test data sub_path", g.SubPath); err != nil {
		return err
	}
	return nil
}

// validateTestDataRefType rejects non-empty values outside the TestDataRefType
// enum; an empty value is valid and falls back to the spec default (data_set).
func validateTestDataRefType(kind, value string) error {
	switch value {
	case "", TestDataRefTypeDataSet, TestDataRefTypePreRecordedData:
		return nil
	}
	return fmt.Errorf("%s type must be %q or %q, got %q", kind, TestDataRefTypeDataSet, TestDataRefTypePreRecordedData, value)
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
