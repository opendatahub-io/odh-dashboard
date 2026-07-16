package fake

import (
	"bytes"
	"context"
	"embed"
	"io"
	"strings"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

//go:embed data
var embeddedData embed.FS

// S3Client is a fake implementation of s3.Client that serves embedded test
// data for local development without real S3.
type S3Client struct{}

var _ s3svc.Client = (*S3Client)(nil)

const fakeExecID = "bc80a9c8-35c2-4346-bcae-0a811ec76a3d"

var fakePatternNames = []string{
	"pattern_1", "pattern_2", "pattern_3", "pattern_4",
	"pattern_5", "pattern_6", "pattern_7", "pattern_8",
}

// Static S3 listings keyed by prefix.
var fakeFiles = map[string][]s3svc.ObjectInfo{
	"": {
		{Key: "benchmark.json", LastModified: "2026-07-10T12:00:00Z", Size: 5557, StorageClass: "STANDARD"},
	},
}

var fakePrefixes = map[string][]s3svc.CommonPrefix{
	"": {
		{Prefix: "autorag input data/"},
		{Prefix: "documents-rag-optimization-pipeline/"},
	},
	"autorag input data/": {
		{Prefix: "autorag input data/json/"},
		{Prefix: "autorag input data/md/"},
		{Prefix: "autorag input data/pdf/"},
		{Prefix: "autorag input data/ppt/"},
		{Prefix: "autorag input data/txt/"},
	},
	"autorag input data/pdf/": {
		{Prefix: "autorag input data/pdf/bank_policies_pdf/"},
		{Prefix: "autorag input data/pdf/ibm_earnings_pdf/"},
	},
	"autorag input data/pdf/ibm_earnings_pdf/": {
		{Prefix: "autorag input data/pdf/ibm_earnings_pdf/documents/"},
	},
}

func (c *S3Client) GetObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.GetObjectInput) (io.ReadCloser, string, error) {
	body, ct := resolveFileContent(input.Key)
	return io.NopCloser(bytes.NewReader(body)), ct, nil
}

func (c *S3Client) DownloadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.DownloadObjectInput) (io.ReadCloser, string, error) {
	body, ct := resolveFileContent(input.Key)
	return io.NopCloser(bytes.NewReader(body)), ct, nil
}

// resolveFileContent maps an S3 key to an embedded data file. Returns
// application/octet-stream for JSON files to match real S3 where pipeline-
// uploaded objects have no explicit content type. The repository layer's
// SanitizeResponseContentType normalises this before the HTTP response.
func resolveFileContent(key string) ([]byte, string) {
	if strings.HasSuffix(key, "component_stage_map/component_stage_map.json") {
		return readEmbedded("data/component_stage_map.json"), "application/octet-stream"
	}
	if strings.HasSuffix(key, "component_status/component_status.json") {
		return resolveComponentStatus(key), "application/octet-stream"
	}
	if strings.HasSuffix(key, "pattern.json") {
		return resolvePatternFile(key), "application/octet-stream"
	}
	if strings.HasSuffix(key, ".json") {
		return []byte("{}"), "application/octet-stream"
	}
	return []byte(""), "application/octet-stream"
}

func resolveComponentStatus(key string) []byte {
	for _, entry := range []struct{ taskID, path string }{
		{"test-data-loader", "data/component_status/test_data_loader.json"},
		{"documents-discovery", "data/component_status/documents_discovery.json"},
		{"text-extraction", "data/component_status/text_extraction.json"},
		{"search-space-preparation", "data/component_status/search_space_preparation.json"},
		{"rag-templates-optimization", "data/component_status/rag_templates_optimization.json"},
	} {
		if strings.Contains(key, entry.taskID+"/") {
			return readEmbedded(entry.path)
		}
	}
	return []byte("{}")
}

func resolvePatternFile(key string) []byte {
	for _, name := range fakePatternNames {
		if strings.Contains(key, name+"/") {
			return readEmbedded("data/patterns/" + name + ".json")
		}
	}
	return []byte("{}")
}

func readEmbedded(path string) []byte {
	data, err := embeddedData.ReadFile(path)
	if err != nil {
		return []byte("{}")
	}
	return data
}

func (c *S3Client) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.UploadObjectInput) error {
	return nil
}

func (c *S3Client) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	contents, prefixes := resolveS3Listing(input.Prefix)
	maxKeys := input.Limit
	if maxKeys <= 0 {
		maxKeys = 1000
	}
	return &s3svc.ListObjectsResponse{
		CommonPrefixes: prefixes,
		Contents:       contents,
		Delimiter:      "/",
		IsTruncated:    false,
		KeyCount:       int32(len(contents) + len(prefixes)),
		MaxKeys:        maxKeys,
		Name:           input.Bucket,
		Prefix:         input.Prefix,
	}, nil
}

func resolveS3Listing(prefix string) ([]s3svc.ObjectInfo, []s3svc.CommonPrefix) {
	if contents, ok := fakeFiles[prefix]; ok {
		p := fakePrefixes[prefix]
		if p == nil {
			p = []s3svc.CommonPrefix{}
		}
		return contents, p
	}
	if p, ok := fakePrefixes[prefix]; ok {
		return []s3svc.ObjectInfo{}, p
	}

	// Dynamic generation for pipeline run output directories.
	pp := "documents-rag-optimization-pipeline/"
	if !strings.HasPrefix(prefix, pp) {
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
	}

	rel := strings.TrimPrefix(prefix, pp)
	depth := len(strings.Split(strings.TrimSuffix(rel, "/"), "/"))
	base := prefix
	if !strings.HasSuffix(base, "/") {
		base += "/"
	}

	switch depth {
	case 1: // {runId}/ → task directories
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
			{Prefix: base + "publish-component-stage-map/"},
			{Prefix: base + "test-data-loader/"},
			{Prefix: base + "documents-discovery/"},
			{Prefix: base + "text-extraction/"},
			{Prefix: base + "search-space-preparation/"},
			{Prefix: base + "rag-templates-optimization/"},
		}
	case 2: // {runId}/{task}/ → execution ID
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{{Prefix: base + fakeExecID + "/"}}
	case 3: // {runId}/{task}/{execId}/ → artifact dirs
		if strings.Contains(prefix, "rag-templates-optimization") {
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
				{Prefix: base + "rag_patterns/"},
				{Prefix: base + "component_stage_map/"},
				{Prefix: base + "component_status/"},
			}
		}
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
			{Prefix: base + "component_stage_map/"},
			{Prefix: base + "component_status/"},
		}
	case 4: // {runId}/{task}/{execId}/rag_patterns/ → pattern dirs
		if strings.Contains(prefix, "rag_patterns") {
			var dirs []s3svc.CommonPrefix
			for _, name := range fakePatternNames {
				dirs = append(dirs, s3svc.CommonPrefix{Prefix: base + name + "/"})
			}
			return []s3svc.ObjectInfo{}, dirs
		}
	case 5: // {runId}/{task}/{execId}/rag_patterns/{pattern}/ → pattern.json
		if strings.Contains(prefix, "rag_patterns") {
			return []s3svc.ObjectInfo{
				{Key: base + "pattern.json", LastModified: "2026-07-16T08:20:00Z", Size: 1024, StorageClass: "STANDARD"},
			}, []s3svc.CommonPrefix{}
		}
	}

	return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
}

func (c *S3Client) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.ObjectExistsInput) (bool, error) {
	return false, nil
}
