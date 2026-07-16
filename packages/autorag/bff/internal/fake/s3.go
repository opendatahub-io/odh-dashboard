package fake

import (
	"context"
	"fmt"
	"io"
	"strings"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3Client is a fake implementation of s3.Client that returns realistic
// file listings and JSON content for local development without real S3.
type S3Client struct{}

var _ s3svc.Client = (*S3Client)(nil)

var fakePatternNames = []string{
	"Pattern1", "Pattern2", "Pattern3", "Pattern4",
	"Pattern5", "Pattern6", "Pattern7", "Pattern8",
}

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

const fakeExecID = "bc80a9c8-35c2-4346-bcae-0a811ec76a3d"

func (c *S3Client) GetObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.GetObjectInput) (io.ReadCloser, string, error) {
	if body, ct, ok := resolveFileContent(input.Key); ok {
		return io.NopCloser(strings.NewReader(body)), ct, nil
	}
	return io.NopCloser(strings.NewReader("")), "application/octet-stream", nil
}

func (c *S3Client) DownloadObject(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.DownloadObjectInput) (io.ReadCloser, string, error) {
	if body, ct, ok := resolveFileContent(input.Key); ok {
		return io.NopCloser(strings.NewReader(body)), ct, nil
	}
	return io.NopCloser(strings.NewReader("")), "application/octet-stream", nil
}

func resolveFileContent(key string) (body, contentType string, ok bool) {
	if strings.HasSuffix(key, "component_stage_map.json") {
		return fakeComponentStageMapJSON, "application/json", true
	}
	if strings.HasSuffix(key, "component_status/component_status.json") {
		return resolveComponentStatusJSON(key), "application/json", true
	}
	if strings.HasSuffix(key, "pattern.json") {
		return resolvePatternJSON(key), "application/json", true
	}
	if strings.HasSuffix(key, ".json") {
		return "{}", "application/json", true
	}
	return "", "", false
}

var fakeComponentStageMapJSON = `{
  "pipeline_id": "documents-rag-optimization-pipeline",
  "description": "AutoRAG pipeline: load test data, discover and extract documents, prepare search space, optimize RAG templates, build leaderboard.",
  "kfp_run_id": "fake-run",
  "published_at": "2026-07-16T07:12:17Z",
  "components": [
    {
      "id": "test_data_loader",
      "description": "Download benchmark test data from S3 and sample records for evaluation.",
      "stages": [
        {"id": "load_benchmark", "description": "Validate S3 access, download benchmark JSON, sample records, and write test data artifact."}
      ]
    },
    {
      "id": "documents_discovery",
      "description": "List input documents in S3 and write a documents descriptor manifest.",
      "stages": [
        {"id": "discover_documents", "description": "List and sample source documents in S3 and write documents_descriptor.json."}
      ]
    },
    {
      "id": "text_extraction",
      "description": "Download listed documents and extract text with docling.",
      "stages": [
        {"id": "extract_documents", "description": "Load descriptor, download sources, run docling extraction, and write text artifacts."}
      ]
    },
    {
      "id": "search_space_preparation",
      "description": "Prepare the AutoRAG search space and model pre-selection report.",
      "stages": [
        {"id": "prepare_search_space", "description": "Validate OGX config, run search-space preparation, model pre-selection, and write the report."}
      ]
    },
    {
      "id": "rag_templates_optimization",
      "description": "Run ai4rag optimization and emit RAG pattern artifacts.",
      "stages": [
        {"id": "optimize_templates", "description": "Validate settings, run ai4rag optimization, and write pattern directories, metrics, and notebooks.",
         "steps": ["chunking", "embedding", "retrieval", "generation", "evaluation"]},
        {"id": "build_leaderboard", "description": "Aggregate pattern metrics and render leaderboard HTML."}
      ]
    }
  ]
}`

func resolveComponentStatusJSON(key string) string {
	if strings.Contains(key, "test-data-loader") {
		return `{"component_id":"test_data_loader","started_at":"2026-07-16T07:12:46Z","completed_at":"2026-07-16T07:12:47Z","stages":[{"id":"load_benchmark","status":"completed","timestamp":"2026-07-16T07:12:47Z"}]}`
	}
	if strings.Contains(key, "documents-discovery") {
		return `{"component_id":"documents_discovery","started_at":"2026-07-16T07:12:50Z","completed_at":"2026-07-16T07:13:10Z","stages":[{"id":"discover_documents","status":"completed","timestamp":"2026-07-16T07:13:10Z"}]}`
	}
	if strings.Contains(key, "text-extraction") {
		return `{"component_id":"text_extraction","started_at":"2026-07-16T07:13:15Z","completed_at":"2026-07-16T07:20:00Z","stages":[{"id":"extract_documents","status":"completed","timestamp":"2026-07-16T07:20:00Z"}]}`
	}
	if strings.Contains(key, "search-space-preparation") {
		return `{"component_id":"search_space_preparation","started_at":"2026-07-16T07:20:05Z","completed_at":"2026-07-16T07:22:00Z","stages":[{"id":"prepare_search_space","status":"completed","timestamp":"2026-07-16T07:22:00Z"}]}`
	}
	if strings.Contains(key, "rag-templates-optimization") {
		return fmt.Sprintf(`{"component_id":"rag_templates_optimization","started_at":"2026-07-16T07:22:05Z","completed_at":"2026-07-16T08:25:00Z","stages":[{"id":"optimize_templates","status":"completed","timestamp":"2026-07-16T08:20:00Z","selected_models":[%s],"steps":["chunking","embedding","retrieval","generation","evaluation"]},{"id":"build_leaderboard","status":"completed","timestamp":"2026-07-16T08:25:00Z"}]}`, patternNamesJSON())
	}
	return "{}"
}

func patternNamesJSON() string {
	var parts []string
	for _, name := range fakePatternNames {
		parts = append(parts, fmt.Sprintf("%q", name))
	}
	return strings.Join(parts, ",")
}

func resolvePatternJSON(key string) string {
	for i, name := range fakePatternNames {
		if strings.Contains(key, name+"/") {
			return fakePatternJSON(name, i)
		}
	}
	return fakePatternJSON("UnknownPattern", 0)
}

func fakePatternJSON(name string, index int) string {
	scores := []struct {
		finalScore, ac, faith, cc float64
	}{
		{0.82, 0.78, 0.85, 0.92},
		{0.79, 0.75, 0.81, 0.88},
		{0.76, 0.72, 0.78, 0.85},
		{0.74, 0.70, 0.76, 0.83},
		{0.71, 0.68, 0.73, 0.80},
		{0.69, 0.65, 0.71, 0.78},
		{0.66, 0.62, 0.68, 0.75},
		{0.63, 0.60, 0.65, 0.72},
	}
	s := scores[0]
	if index < len(scores) {
		s = scores[index]
	}

	chunkSize := 256 + (index%3)*128
	chunkOverlap := 32 + (index%2)*32
	models := []string{
		"vllm-inference/meta-llama/Llama-3.1-8B-Instruct",
		"vllm-inference/ibm-granite/granite-3.1-8b-instruct",
	}
	model := models[index%len(models)]

	return fmt.Sprintf(`{
  "name": %q,
  "iteration": %d,
  "max_combinations": 20,
  "duration_seconds": %d,
  "settings": {
    "vector_store": {"datasource_type": "milvus", "collection_name": "collection_%d"},
    "chunking": {"method": "recursive", "chunk_size": %d, "chunk_overlap": %d},
    "embedding": {
      "model_id": "vllm-embedding/ibm-granite/granite-embedding-english-r2",
      "distance_metric": "cosine",
      "embedding_params": {"embedding_dimension": 768, "context_length": 512, "timeout": null, "model_type": null, "provider_id": null, "provider_resource_id": null}
    },
    "retrieval": {"method": "window", "number_of_chunks": %d},
    "generation": {
      "model_id": %q,
      "context_template_text": "{document}",
      "user_message_text": "",
      "system_message_text": ""
    }
  },
  "scores": {
    "answer_correctness": {"mean": %.2f, "ci_low": %.2f, "ci_high": %.2f},
    "faithfulness": {"mean": %.2f, "ci_low": %.2f, "ci_high": %.2f},
    "context_correctness": {"mean": %.2f, "ci_low": %.2f, "ci_high": %.2f}
  },
  "final_score": %.2f
}`, name, index, 120+index*30, index,
		chunkSize, chunkOverlap,
		3+index%3, model,
		s.ac, s.ac-0.05, s.ac+0.10,
		s.faith, s.faith-0.08, s.faith+0.10,
		s.cc, s.cc-0.03, s.cc+0.05,
		s.finalScore)
}

func (c *S3Client) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.UploadObjectInput) error {
	return nil
}

func (c *S3Client) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	prefix := input.Prefix

	contents, prefixes := resolveS3Listing(prefix)

	keyCount := int32(len(contents) + len(prefixes))
	maxKeys := input.Limit
	if maxKeys <= 0 {
		maxKeys = 1000
	}

	return &s3svc.ListObjectsResponse{
		CommonPrefixes: prefixes,
		Contents:       contents,
		Delimiter:      "/",
		IsTruncated:    false,
		KeyCount:       keyCount,
		MaxKeys:        maxKeys,
		Name:           input.Bucket,
		Prefix:         prefix,
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
	if prefixes, ok := fakePrefixes[prefix]; ok {
		return []s3svc.ObjectInfo{}, prefixes
	}

	pipelinePrefix := "documents-rag-optimization-pipeline/"
	if !strings.HasPrefix(prefix, pipelinePrefix) {
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
	}

	rel := strings.TrimPrefix(prefix, pipelinePrefix)
	depth := len(strings.Split(strings.TrimSuffix(rel, "/"), "/"))

	base := prefix
	if !strings.HasSuffix(base, "/") {
		base += "/"
	}

	switch depth {
	case 1:
		// {runId}/ → component task directories
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
			{Prefix: base + "publish-component-stage-map/"},
			{Prefix: base + "test-data-loader/"},
			{Prefix: base + "documents-discovery/"},
			{Prefix: base + "text-extraction/"},
			{Prefix: base + "search-space-preparation/"},
			{Prefix: base + "rag-templates-optimization/"},
		}
	case 2:
		// {runId}/{task}/ → execution ID directory
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
			{Prefix: base + fakeExecID + "/"},
		}
	case 3:
		// {runId}/{task}/{execId}/ → artifact directories
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
	case 4:
		// {runId}/{task}/{execId}/rag_patterns/ → Pattern1/, Pattern2/, etc.
		if strings.Contains(prefix, "rag_patterns") {
			var prefixes []s3svc.CommonPrefix
			for _, name := range fakePatternNames {
				prefixes = append(prefixes, s3svc.CommonPrefix{Prefix: base + name + "/"})
			}
			return []s3svc.ObjectInfo{}, prefixes
		}
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
	case 5:
		// {runId}/{task}/{execId}/rag_patterns/{Pattern}/ → pattern.json
		if strings.Contains(prefix, "rag_patterns") {
			return []s3svc.ObjectInfo{
				{Key: base + "pattern.json", LastModified: "2026-07-16T08:20:00Z", Size: 1024, StorageClass: "STANDARD"},
			}, []s3svc.CommonPrefix{}
		}
		return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
	}

	return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
}

func (c *S3Client) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.ObjectExistsInput) (bool, error) {
	return false, nil
}
