package fake

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3Client is a fake implementation of s3.Client that uses a local directory
// (s3-bucket/) as a filesystem-backed S3 bucket. Reads serve files from disk,
// uploads write to disk, and listings walk the directory tree — matching how
// a real S3 bucket behaves.
type S3Client struct {
	mu           sync.Mutex
	rootDir      string
	resolvedRoot string
}

var _ s3svc.Client = (*S3Client)(nil)

var seedRunIDs = map[string]bool{
	binarySeedID: true, multiclassSeedID: true,
	regressionSeedID: true, timeseriesSeedID: true,
}

// runSeedAliases maps new run IDs to seed run IDs. PipelinesClient writes
// here when a run completes; S3Client reads here to resolve the seed directory.
var runSeedAliases = struct {
	sync.Mutex
	m map[string]string
}{m: make(map[string]string)}

// RegisterRunAlias records which seed run ID a new run should resolve to.
func RegisterRunAlias(runID, seedID string) {
	runSeedAliases.Lock()
	runSeedAliases.m[runID] = seedID
	runSeedAliases.Unlock()
}

func lookupRunAlias(runID string) (string, bool) {
	runSeedAliases.Lock()
	defer runSeedAliases.Unlock()
	id, ok := runSeedAliases.m[runID]
	return id, ok
}

// rewriteToSeedRun replaces an unknown run ID with the matching seed run ID.
func rewriteToSeedRun(key string) string {
	for _, pp := range []string{tabularPipelinePrefix, timeseriesPipelinePrefix} {
		if !strings.HasPrefix(key, pp+"/") {
			continue
		}
		rest := strings.TrimPrefix(key, pp+"/")
		slash := strings.Index(rest, "/")
		if slash < 0 {
			return key
		}
		runID := rest[:slash]
		if seedRunIDs[runID] {
			return key
		}
		if alias, ok := lookupRunAlias(runID); ok {
			return pp + "/" + alias + rest[slash:]
		}
		fallback := regressionSeedID
		if pp == timeseriesPipelinePrefix {
			fallback = timeseriesSeedID
		}
		return pp + "/" + fallback + rest[slash:]
	}
	return key
}

func extractRunID(prefix string) string {
	for _, pp := range []string{tabularPipelinePrefix, timeseriesPipelinePrefix} {
		if !strings.HasPrefix(prefix, pp+"/") {
			continue
		}
		rest := strings.TrimPrefix(prefix, pp+"/")
		if slash := strings.Index(rest, "/"); slash > 0 {
			return rest[:slash]
		}
		return rest
	}
	return ""
}

// s3BucketRoot returns the absolute path to the s3-bucket/ directory adjacent
// to this source file. Using runtime.Caller ensures it works regardless of
// the working directory the binary is started from.
func s3BucketRoot() string {
	_, thisFile, _, _ := runtime.Caller(0)
	return filepath.Join(filepath.Dir(thisFile), "s3-bucket")
}

func NewS3Client() *S3Client {
	root := s3BucketRoot()
	resolved, err := filepath.EvalSymlinks(root)
	if err != nil {
		resolved = root
	}
	c := &S3Client{rootDir: root, resolvedRoot: resolved}
	c.cleanNonSeedData()
	return c
}

var seedDirs = map[string]bool{
	"automl input data":      true,
	tabularPipelinePrefix:    true,
	timeseriesPipelinePrefix: true,
}

// cleanNonSeedData removes any top-level files or directories inside s3-bucket/
// that aren't part of the seed data. This resets the bucket between restarts.
func (c *S3Client) cleanNonSeedData() {
	entries, err := os.ReadDir(c.rootDir)
	if err != nil {
		return
	}
	for _, entry := range entries {
		name := entry.Name()
		if name == ".gitignore" || seedDirs[name] {
			continue
		}
		target := filepath.Join(c.rootDir, name)
		if err := c.resolveAndVerify(target); err != nil {
			continue
		}
		_ = os.RemoveAll(target)
	}
}

// safePath resolves an S3 key to an absolute filesystem path within rootDir.
// Returns an error if the resolved path escapes the root (path traversal),
// or if any component is a symlink (symlink escape).
func (c *S3Client) safePath(key string) (string, error) {
	if key == "" {
		return c.rootDir, nil
	}
	key = rewriteToSeedRun(key)
	joined := filepath.Join(c.rootDir, filepath.FromSlash(key))
	abs, err := filepath.Abs(joined)
	if err != nil {
		return "", fmt.Errorf("invalid key %q: %w", key, err)
	}
	// Append separator to prevent false prefix match (e.g. /foo/bar vs /foo/bar-evil).
	if abs != c.rootDir && !strings.HasPrefix(abs, c.rootDir+string(filepath.Separator)) {
		return "", fmt.Errorf("key %q escapes bucket root", key)
	}

	// Resolve symlinks in the deepest existing ancestor and verify the
	// path remains within the bucket root.
	if err := c.resolveAndVerify(abs); err != nil {
		return "", fmt.Errorf("key %q: %w", key, err)
	}
	return abs, nil
}

// resolveAndVerify resolves symlinks in the deepest existing ancestor of path
// and verifies the resolved result remains within the bucket root. Unlike a
// segment-by-segment Lstat walk that breaks early on non-existent segments,
// EvalSymlinks resolves all symlinks in the existing portion atomically.
func (c *S3Client) resolveAndVerify(path string) error {
	existing := path
	for existing != c.rootDir {
		if _, err := os.Lstat(existing); err == nil {
			break
		}
		parent := filepath.Dir(existing)
		if parent == existing {
			break
		}
		existing = parent
	}
	resolved, err := filepath.EvalSymlinks(existing)
	if err != nil {
		return fmt.Errorf("symlink resolution failed: %w", err)
	}
	if resolved != c.resolvedRoot && !strings.HasPrefix(resolved, c.resolvedRoot+string(filepath.Separator)) {
		return fmt.Errorf("path escapes bucket root after symlink resolution")
	}
	return nil
}

func (c *S3Client) GetObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.GetObjectInput) (io.ReadCloser, string, error) {
	path, err := c.safePath(input.Key)
	if err != nil {
		return nil, "", fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.resolveAndVerify(path); err != nil {
		return nil, "", fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read object %q: %w", input.Key, err)
	}
	// Return application/octet-stream to match real S3 where pipeline-uploaded
	// objects have no explicit content type. The repository layer's
	// SanitizeResponseContentType normalises this before the HTTP response.
	ct := "application/octet-stream"
	if strings.HasSuffix(strings.ToLower(input.Key), ".csv") {
		ct = "text/csv"
	}
	return io.NopCloser(bytes.NewReader(data)), ct, nil
}

func (c *S3Client) DownloadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.DownloadObjectInput) (io.ReadCloser, string, error) {
	path, err := c.safePath(input.Key)
	if err != nil {
		return nil, "", fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.resolveAndVerify(path); err != nil {
		return nil, "", fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, "", fmt.Errorf("failed to read object %q: %w", input.Key, err)
	}
	ct := "application/octet-stream"
	if strings.HasSuffix(strings.ToLower(input.Key), ".csv") {
		ct = "text/csv"
	}
	return io.NopCloser(bytes.NewReader(data)), ct, nil
}

func (c *S3Client) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.UploadObjectInput) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	path, err := c.safePath(input.Key)
	if err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		return err
	}
	// Re-verify after MkdirAll: all path components now exist, so
	// EvalSymlinks can detect symlinks introduced since safePath ran.
	if err := c.resolveAndVerify(path); err != nil {
		return err
	}
	const maxUploadBytes = 64 << 20 // 64 MiB defense-in-depth cap
	limited := io.LimitReader(input.Body, maxUploadBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return err
	}
	if int64(len(data)) > maxUploadBytes {
		return fmt.Errorf("upload exceeds %d byte limit", maxUploadBytes)
	}
	return os.WriteFile(path, data, 0o644)
}

func (c *S3Client) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ObjectExistsInput) (bool, error) {
	path, err := c.safePath(input.Key)
	if err != nil {
		return false, fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.resolveAndVerify(path); err != nil {
		return false, fmt.Errorf("rejected key %q: %w", input.Key, err)
	}
	info, err := os.Stat(path)
	if err != nil {
		return false, nil
	}
	return !info.IsDir(), nil
}

func (c *S3Client) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	originalPrefix := input.Prefix
	diskPrefix := rewriteToSeedRun(originalPrefix)

	maxKeys := input.Limit
	if maxKeys <= 0 {
		maxKeys = 1000
	}

	emptyResp := &s3svc.ListObjectsResponse{
		Contents:       []s3svc.ObjectInfo{},
		CommonPrefixes: []s3svc.CommonPrefix{},
		Delimiter:      "/",
		MaxKeys:        maxKeys,
		Name:           input.Bucket,
		Prefix:         originalPrefix,
	}

	absDir, err := c.safePath(diskPrefix)
	if err != nil {
		return nil, fmt.Errorf("rejected prefix %q: %w", input.Prefix, err)
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	if err := c.resolveAndVerify(absDir); err != nil {
		return nil, fmt.Errorf("rejected prefix %q: %w", input.Prefix, err)
	}
	searchPrefix := ""
	if diskPrefix != "" && !strings.HasSuffix(diskPrefix, "/") {
		searchPrefix = filepath.Base(absDir)
		absDir = filepath.Dir(absDir)
	}

	entries, err := os.ReadDir(absDir)
	if err != nil {
		return emptyResp, nil
	}

	var contents []s3svc.ObjectInfo
	var prefixes []s3svc.CommonPrefix

	for _, entry := range entries {
		name := entry.Name()
		if name == ".gitignore" {
			continue
		}
		if searchPrefix != "" && !strings.HasPrefix(name, searchPrefix) {
			continue
		}

		if entry.IsDir() {
			dirPfx := diskPrefix
			if !strings.HasSuffix(dirPfx, "/") && dirPfx != "" {
				dirPfx = filepath.ToSlash(filepath.Dir(filepath.Join(c.rootDir, filepath.FromSlash(diskPrefix))))
				dirPfx = strings.TrimPrefix(dirPfx, filepath.ToSlash(c.rootDir))
				if dirPfx != "" {
					dirPfx = strings.TrimPrefix(dirPfx, "/") + "/"
				}
			}
			prefixes = append(prefixes, s3svc.CommonPrefix{
				Prefix: dirPfx + name + "/",
			})
		} else {
			info, _ := entry.Info()
			modTime := ""
			var size int64
			if info != nil {
				modTime = info.ModTime().UTC().Format(time.RFC3339)
				size = info.Size()
			}
			key := diskPrefix + name
			if !strings.HasSuffix(diskPrefix, "/") && diskPrefix != "" {
				rel := strings.TrimPrefix(filepath.ToSlash(absDir), filepath.ToSlash(c.rootDir))
				rel = strings.TrimPrefix(rel, "/")
				if rel != "" {
					key = rel + "/" + name
				} else {
					key = name
				}
			}
			contents = append(contents, s3svc.ObjectInfo{
				Key:          key,
				LastModified: modTime,
				Size:         size,
				StorageClass: "STANDARD",
			})
		}
	}

	if contents == nil {
		contents = []s3svc.ObjectInfo{}
	}
	if prefixes == nil {
		prefixes = []s3svc.CommonPrefix{}
	}

	// Swap the seed run ID back to the original run ID in returned paths.
	if diskPrefix != originalPrefix {
		origRunID := extractRunID(originalPrefix)
		diskRunID := extractRunID(diskPrefix)
		for i := range contents {
			contents[i].Key = strings.Replace(contents[i].Key, diskRunID, origRunID, 1)
		}
		for i := range prefixes {
			prefixes[i].Prefix = strings.Replace(prefixes[i].Prefix, diskRunID, origRunID, 1)
		}
	}

	return &s3svc.ListObjectsResponse{
		CommonPrefixes: prefixes,
		Contents:       contents,
		Delimiter:      "/",
		IsTruncated:    false,
		KeyCount:       int32(len(contents) + len(prefixes)),
		MaxKeys:        maxKeys,
		Name:           input.Bucket,
		Prefix:         originalPrefix,
	}, nil
}
