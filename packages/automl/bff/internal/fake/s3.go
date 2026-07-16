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

const seedRunID = "1649271d-6882-4c7f-b6db-20459447d2e8"

var (
	runOutputBase      = "autogluon-tabular-training-pipeline/" + seedRunID + "/"
	trainingTaskBase   = runOutputBase + "autogluon-models-training-2/"
	execIDBase         = trainingTaskBase + "3848043318/"
	modelsArtifactBase = execIDBase + "models_artifact/"
)

var fakeModelNames = []string{
	"WeightedEnsemble_L2_FULL",
	"LightGBM_FULL",
	"CatBoost_FULL",
}

// Static S3 listings keyed by bucket → prefix.
// model.json files under modelsArtifactBase are for the seed run only;
// dynamically created runs use the depth-based generator in resolveS3Listing.
var fakeFiles = map[string]map[string][]s3svc.ObjectInfo{
	"automl-data": {
		"": {
			{Key: "automl-test-data-522120.csv", LastModified: "2026-07-13T20:47:03Z", Size: 1869, StorageClass: "STANDARD"},
			{Key: "automl-test-data-522121.csv", LastModified: "2026-06-30T18:01:41Z", Size: 1869, StorageClass: "STANDARD"},
		},
		"automl input data/": {
			{Key: "automl input data/TitanicFullMF.csv", LastModified: "2026-05-12T15:42:08Z", Size: 57893, StorageClass: "STANDARD"},
			{Key: "automl input data/ghosts_train.csv", LastModified: "2026-05-12T15:42:07Z", Size: 34499, StorageClass: "STANDARD"},
			{Key: "automl input data/height.csv", LastModified: "2026-05-12T15:42:08Z", Size: 1119, StorageClass: "STANDARD"},
			{Key: "automl input data/mushrooms.csv", LastModified: "2026-05-12T15:42:08Z", Size: 1273564, StorageClass: "STANDARD"},
		},
		modelsArtifactBase + "WeightedEnsemble_L2_FULL/": {
			{Key: modelsArtifactBase + "WeightedEnsemble_L2_FULL/model.json", LastModified: "2026-07-15T21:51:00Z", Size: 512, StorageClass: "STANDARD"},
		},
		modelsArtifactBase + "LightGBM_FULL/": {
			{Key: modelsArtifactBase + "LightGBM_FULL/model.json", LastModified: "2026-07-15T21:50:00Z", Size: 480, StorageClass: "STANDARD"},
		},
		modelsArtifactBase + "CatBoost_FULL/": {
			{Key: modelsArtifactBase + "CatBoost_FULL/model.json", LastModified: "2026-07-15T21:49:00Z", Size: 470, StorageClass: "STANDARD"},
		},
	},
}

var fakePrefixes = map[string]map[string][]s3svc.CommonPrefix{
	"automl-data": {
		"": {
			{Prefix: "autogluon-tabular-training-pipeline/"},
			{Prefix: "autogluon-timeseries-training-pipeline/"},
			{Prefix: "automl input data/"},
		},
		"automl input data/": {
			{Prefix: "automl input data/timeseries/"},
		},
		// Component dirs (data-preparation, training) serve component_status.json
		// for the stage-map topology. autogluon-models-training-2 is the actual
		// KFP task output used for model artifact discovery.
		runOutputBase: {
			{Prefix: runOutputBase + "publish-component-stage-map/"},
			{Prefix: runOutputBase + "data-preparation/"},
			{Prefix: runOutputBase + "training/"},
			{Prefix: runOutputBase + "autogluon-models-training-2/"},
		},
		trainingTaskBase: {
			{Prefix: execIDBase},
		},
		modelsArtifactBase: {
			{Prefix: modelsArtifactBase + "WeightedEnsemble_L2_FULL/"},
			{Prefix: modelsArtifactBase + "LightGBM_FULL/"},
			{Prefix: modelsArtifactBase + "CatBoost_FULL/"},
		},
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
	if strings.HasSuffix(strings.ToLower(key), ".csv") {
		return readEmbedded("data/sample.csv"), "text/csv"
	}
	if strings.HasSuffix(key, "component_stage_map/component_stage_map.json") {
		return readEmbedded("data/component_stage_map.json"), "application/octet-stream"
	}
	if strings.HasSuffix(key, "component_status/component_status.json") {
		return resolveComponentStatus(key), "application/octet-stream"
	}
	if strings.HasSuffix(key, "model.json") {
		return resolveModelFile(key), "application/octet-stream"
	}
	if strings.HasSuffix(key, "feature_importance.json") {
		return resolveFeatureImportance(key), "application/octet-stream"
	}
	if strings.HasSuffix(key, ".json") {
		return []byte("{}"), "application/octet-stream"
	}
	return []byte(""), "application/octet-stream"
}

func resolveModelFile(key string) []byte {
	for _, name := range fakeModelNames {
		if strings.Contains(key, name) {
			return readEmbedded("data/models/" + name + "/model.json")
		}
	}
	return []byte("{}")
}

func resolveFeatureImportance(key string) []byte {
	for _, name := range fakeModelNames {
		if strings.Contains(key, name) {
			return readEmbedded("data/models/" + name + "/feature_importance.json")
		}
	}
	return []byte("{}")
}

func resolveComponentStatus(key string) []byte {
	for _, entry := range []struct{ taskID, path string }{
		{"data-preparation", "data/component_status/data_preparation.json"},
		{"training", "data/component_status/training.json"},
	} {
		if strings.Contains(key, entry.taskID+"/") {
			return readEmbedded(entry.path)
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
	contents, prefixes := resolveS3Listing(input.Bucket, input.Prefix)
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

func resolveS3Listing(bucket, prefix string) ([]s3svc.ObjectInfo, []s3svc.CommonPrefix) {
	bucketFiles := fakeFiles["automl-data"]
	bucketPrefixes := fakePrefixes["automl-data"]
	if bf, ok := fakeFiles[bucket]; ok {
		bucketFiles = bf
	}
	if bp, ok := fakePrefixes[bucket]; ok {
		bucketPrefixes = bp
	}

	if contents, ok := bucketFiles[prefix]; ok {
		p := bucketPrefixes[prefix]
		if p == nil {
			p = []s3svc.CommonPrefix{}
		}
		return contents, p
	}
	if p, ok := bucketPrefixes[prefix]; ok {
		return []s3svc.ObjectInfo{}, p
	}

	// Dynamic generation for pipeline run output directories so newly created
	// runs also have artifacts. Prefixes may or may not end with "/" (the
	// frontend's discoverStatusJsonPath omits it), so we normalise first.
	for _, pp := range []string{"autogluon-tabular-training-pipeline/", "autogluon-timeseries-training-pipeline/"} {
		if !strings.HasPrefix(prefix, pp) {
			continue
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
				{Prefix: base + "data-preparation/"},
				{Prefix: base + "training/"},
				{Prefix: base + "autogluon-models-training-2/"},
			}
		case 2: // {runId}/{task}/ → execution ID
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{{Prefix: base + "3848043318/"}}
		case 3: // {runId}/{task}/{execId}/ → artifact dirs
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
				{Prefix: base + "models_artifact/"},
				{Prefix: base + "component_stage_map/"},
				{Prefix: base + "component_status/"},
			}
		case 4: // {runId}/{task}/{execId}/models_artifact/ → model dirs
			if strings.Contains(prefix, "models_artifact") {
				return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
					{Prefix: base + "WeightedEnsemble_L2_FULL/"},
					{Prefix: base + "LightGBM_FULL/"},
					{Prefix: base + "CatBoost_FULL/"},
				}
			}
		case 5: // {runId}/{task}/{execId}/models_artifact/{model}/ → model.json
			return []s3svc.ObjectInfo{
				{Key: base + "model.json", LastModified: "2026-07-15T21:51:00Z", Size: 512, StorageClass: "STANDARD"},
			}, []s3svc.CommonPrefix{}
		}
	}

	return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
}

func (c *S3Client) ObjectExists(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.ObjectExistsInput) (bool, error) {
	return false, nil
}
