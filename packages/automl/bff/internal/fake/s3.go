package fake

import (
	"context"
	"fmt"
	"io"
	"strings"

	s3svc "github.com/opendatahub-io/odh-dashboard/packages/autox-core/services/s3"
)

// S3Client is a fake implementation of s3.Client that returns realistic
// file listings and CSV content for local development without real S3.
type S3Client struct{}

var _ s3svc.Client = (*S3Client)(nil)

// fakeCSV contains 100 rows of Titanic data for CSV schema inference.
var fakeCSV = "PassengerId,Survived,Pclass,Name,Sex,Age,SibSp,Parch,Ticket,Fare,Cabin,Embarked\n" +
	"1,0,3,\"Braund, Mr. Owen Harris\",male,22,1,0,A/5 21171,7.25,,S\n" +
	"2,1,1,\"Cumings, Mrs. John Bradley\",female,38,1,0,PC 17599,71.2833,C85,C\n" +
	"3,1,3,\"Heikkinen, Miss. Laina\",female,26,0,0,STON/O2. 3101282,7.925,,S\n" +
	"4,1,1,\"Futrelle, Mrs. Jacques Heath\",female,35,1,0,113803,53.1,C123,S\n" +
	"5,0,3,\"Allen, Mr. William Henry\",male,35,0,0,373450,8.05,,S\n" +
	"6,0,3,\"Moran, Mr. James\",male,,0,0,330877,8.4583,,Q\n" +
	"7,0,1,\"McCarthy, Mr. Timothy J\",male,54,0,0,17463,51.8625,E46,S\n" +
	"8,0,3,\"Palsson, Master. Gosta Leonard\",male,2,3,1,349909,21.075,,S\n" +
	"9,1,3,\"Johnson, Mrs. Oscar W\",female,27,0,2,347742,11.1333,,S\n" +
	"10,1,2,\"Nasser, Mrs. Nicholas\",female,14,1,0,237736,30.0708,,C\n" +
	"11,1,3,\"Sandstrom, Miss. Marguerite Rut\",female,4,1,1,PP 9549,16.7,G6,S\n" +
	"12,1,1,\"Bonnell, Miss. Elizabeth\",female,58,0,0,113783,26.55,C103,S\n" +
	"13,0,3,\"Saundercock, Mr. William Henry\",male,20,0,0,A/5. 2151,8.05,,S\n" +
	"14,0,3,\"Andersson, Mr. Anders Johan\",male,39,1,5,347082,31.275,,S\n" +
	"15,0,3,\"Vestrom, Miss. Hulda Amanda\",female,14,0,0,350406,7.8542,,S\n" +
	"16,1,2,\"Hewlett, Mrs. Mary D Kingcome\",female,55,0,0,248706,16,,S\n" +
	"17,0,3,\"Rice, Master. Eugene\",male,2,4,1,382652,29.125,,Q\n" +
	"18,1,2,\"Williams, Mr. Charles Eugene\",male,,0,0,244373,13,,S\n" +
	"19,0,3,\"Vander Planke, Mrs. Julius\",female,31,1,0,345763,18,,S\n" +
	"20,1,3,\"Masselmani, Mrs. Fatima\",female,,0,0,2649,7.225,,C\n" +
	"21,0,2,\"Fynney, Mr. Joseph J\",male,35,0,0,239865,26,,S\n" +
	"22,1,2,\"Beesley, Mr. Lawrence\",male,34,0,0,248698,13,,S\n" +
	"23,1,3,\"McGowan, Miss. Anna\",female,15,0,0,330923,8.0292,,Q\n" +
	"24,1,1,\"Sloper, Mr. William Thompson\",male,28,0,0,113788,35.5,A6,S\n" +
	"25,0,3,\"Palsson, Miss. Torborg Danira\",female,8,3,1,349909,21.075,,S\n" +
	"26,1,3,\"Asplund, Mrs. Carl Oscar\",female,38,1,5,347077,31.3875,,S\n" +
	"27,0,3,\"Emir, Mr. Farred Chehab\",male,,0,0,2631,7.225,,C\n" +
	"28,0,1,\"Fortune, Mr. Charles Alexander\",male,19,3,2,19950,263,,S\n" +
	"29,1,3,\"O'Dwyer, Miss. Ellen\",female,,0,0,330959,7.8792,,Q\n" +
	"30,0,3,\"Todoroff, Mr. Lalio\",male,,0,0,349216,7.8958,,S\n" +
	"31,0,1,\"Uruchurtu, Don. Manuel E\",male,40,0,0,PC 17601,27.7208,,C\n" +
	"32,1,1,\"Spencer, Mrs. William Augustus\",female,,1,0,PC 17569,146.5208,B78,C\n" +
	"33,1,3,\"Glynn, Miss. Mary Agatha\",female,,0,0,335677,7.75,,Q\n" +
	"34,0,2,\"Wheadon, Mr. Edward H\",male,66,0,0,C.A. 24579,10.5,,S\n" +
	"35,0,1,\"Meyer, Mr. Edgar Joseph\",male,28,1,0,PC 17604,82.1708,,C\n" +
	"36,0,1,\"Holverson, Mr. Alexander Oskar\",male,42,1,0,113789,52,,S\n" +
	"37,1,3,\"Mamee, Mr. Hanna\",male,,0,0,2677,7.2292,,C\n" +
	"38,0,3,\"Cann, Mr. Ernest Charles\",male,21,0,0,A./5. 2152,8.05,,S\n" +
	"39,0,3,\"Vander Planke, Miss. Augusta Maria\",female,18,2,0,345764,18,,S\n" +
	"40,1,3,\"Nicola-Yarred, Miss. Jamila\",female,14,1,0,2651,11.2417,,C\n" +
	"41,0,3,\"Ahlin, Mrs. Johan\",female,40,1,0,7546,9.475,,S\n" +
	"42,0,2,\"Turpin, Mrs. William John Robert\",female,27,1,0,11668,21,,S\n" +
	"43,0,3,\"Kraeff, Mr. Theodor\",male,,0,0,349253,7.8958,,C\n" +
	"44,1,2,\"Laroche, Miss. Simonne Marie Anne\",female,3,1,2,SC/Paris 2123,41.5792,,C\n" +
	"45,1,3,\"Devaney, Miss. Margaret Delia\",female,19,0,0,330958,7.8792,,Q\n" +
	"46,0,3,\"Rogers, Mr. William John\",male,,0,0,S.C./A.4. 23567,8.05,,S\n" +
	"47,0,3,\"Lennon, Mr. Denis\",male,,1,0,370371,15.5,,Q\n" +
	"48,1,3,\"O'Driscoll, Miss. Bridget\",female,,0,0,14311,7.75,,Q\n" +
	"49,0,3,\"Samaan, Mr. Youssef\",male,,2,0,2662,21.6792,,C\n" +
	"50,0,3,\"Arnold-Franchi, Mrs. Josef\",female,18,1,0,349237,17.8,,S\n" +
	"51,0,3,\"Panula, Master. Juha Niilo\",male,7,4,1,3101295,39.6875,,S\n" +
	"52,0,3,\"Nosworthy, Mr. Richard Cater\",male,21,0,0,A/4. 39886,7.8,,S\n" +
	"53,1,1,\"Harper, Mrs. Henry Sleeper\",female,49,1,0,PC 17572,76.7292,D33,C\n" +
	"54,1,2,\"Faunthorpe, Mrs. Lizzie\",female,29,1,0,2926,26,,S\n" +
	"55,0,1,\"Ostby, Mr. Engelhart Cornelius\",male,65,0,1,113509,61.9792,B30,C\n" +
	"56,1,1,\"Woolner, Mr. Hugh\",male,,0,0,19947,35.5,C52,S\n" +
	"57,1,2,\"Rugg, Miss. Emily\",female,21,0,0,C.A. 31026,10.5,,S\n" +
	"58,0,3,\"Novel, Mr. Mansouer\",male,28.5,0,0,2697,7.2292,,C\n" +
	"59,1,2,\"West, Miss. Constance Mirium\",female,5,1,2,C.A. 34651,27.75,,S\n" +
	"60,0,3,\"Goodwin, Master. William Frederick\",male,11,5,2,CA 2144,46.9,,S\n" +
	"61,0,3,\"Sirayanian, Mr. Orsen\",male,22,0,0,2669,7.2292,,C\n" +
	"62,1,1,\"Icard, Miss. Amelie\",female,38,0,0,113572,80,B28,\n" +
	"63,0,1,\"Harris, Mr. Henry Birkhardt\",male,45,1,0,36973,83.475,C83,S\n" +
	"64,0,3,\"Skoog, Master. Harald\",male,4,3,2,347088,27.9,,S\n" +
	"65,0,1,\"Stewart, Mr. Albert A\",male,,0,0,PC 17605,27.7208,,C\n" +
	"66,1,3,\"Moubarek, Master. Gerios\",male,,1,1,2661,15.2458,,C\n" +
	"67,1,2,\"Nye, Mrs. Elizabeth Ramell\",female,29,0,0,C.A. 29395,10.5,F33,S\n" +
	"68,0,3,\"Crease, Mr. Ernest James\",male,19,0,0,S.P. 3464,8.1583,,S\n" +
	"69,1,3,\"Andersson, Miss. Erna Alexandra\",female,17,4,2,3101281,7.925,,S\n" +
	"70,0,3,\"Kink, Mr. Vincenz\",male,26,2,0,315151,8.6625,,S\n" +
	"71,0,2,\"Jenkin, Mr. Stephen Curnow\",male,32,0,0,C.A. 33111,10.5,,S\n" +
	"72,0,3,\"Goodwin, Miss. Lillian Amy\",female,16,5,2,CA 2144,46.9,,S\n" +
	"73,0,2,\"Hood, Mr. Ambrose Jr\",male,21,0,0,S.O.C. 14879,73.5,,S\n" +
	"74,0,3,\"Celic, Mr. Adem\",male,38,0,0,2620,7.05,,S\n" +
	"75,1,3,\"Moor, Master. Meier\",male,6,0,1,392096,12.475,E121,S\n" +
	"76,0,3,\"van Melkebeke, Mr. Philemon\",male,,0,0,345777,9.5,,S\n" +
	"77,0,3,\"Johnson, Master. Harold Theodor\",male,4,1,1,347742,11.1333,,S\n" +
	"78,0,3,\"Karlsson, Mr. Nils August\",male,22,0,0,350060,7.5208,,S\n" +
	"79,1,2,\"Navratil, Master. Michel M\",male,3,1,1,230080,26,F2,S\n" +
	"80,1,1,\"Bystrom, Mrs. Karolina\",female,42,0,0,236852,13,,S\n" +
	"81,0,3,\"Gustafsson, Mr. Anders Vilhelm\",male,37,2,0,3101276,7.925,,S\n" +
	"82,1,3,\"Sheerlinck, Mr. Jan Baptist\",male,29,0,0,345779,9.5,,S\n" +
	"83,1,3,\"McDermott, Miss. Brigdet Delia\",female,,0,0,330932,7.7875,,Q\n" +
	"84,0,1,\"Carrau, Mr. Francisco M\",male,28,0,0,113059,47.1,,S\n" +
	"85,1,2,\"Ilett, Miss. Vera\",female,17,0,0,SO/C 14885,10.5,,S\n" +
	"86,1,3,\"Backstrom, Mrs. Karl Alfred\",female,33,3,0,3101278,15.85,,S\n" +
	"87,0,3,\"Ford, Mr. William Neal\",male,16,1,3,W./C. 6608,34.375,,S\n" +
	"88,0,3,\"Slocovski, Mr. Selman Francis\",male,,0,0,SOTON/OQ 392086,8.05,,S\n" +
	"89,1,1,\"Fortune, Miss. Mabel Helen\",female,23,3,2,19950,263,C23 C25 C27,S\n" +
	"90,0,3,\"Celotti, Mr. Francesco\",male,24,0,0,343275,8.05,,S\n" +
	"91,0,3,\"Christmann, Mr. Emil\",male,29,0,0,343276,8.05,,S\n" +
	"92,0,3,\"Andreasson, Mr. Paul Edvin\",male,20,0,0,347466,7.8542,,S\n" +
	"93,0,1,\"Chaffee, Mr. Herbert Fuller\",male,46,1,0,W.E.P. 5734,61.175,E31,S\n" +
	"94,0,3,\"Dean, Mr. Bertram Frank\",male,26,1,2,C.A. 2315,20.575,,S\n" +
	"95,0,3,\"Coxon, Mr. Daniel\",male,59,0,0,364500,7.25,,S\n" +
	"96,0,3,\"Dishon, Mr. Manheim\",male,,0,0,A/4. 49871,8.05,,S\n" +
	"97,0,1,\"Goldschmidt, Mr. George B\",male,71,0,0,PC 17754,34.6542,A5,C\n" +
	"98,1,1,\"Greenfield, Mr. William Bertram\",male,23,0,1,PC 17759,63.3583,D10 D12,C\n" +
	"99,1,2,\"Doling, Mrs. John T\",female,34,0,1,231919,23,,S\n" +
	"100,0,2,\"Kantor, Mr. Sinai\",male,34,1,0,244367,26,,S\n"

// seedRunID is the run ID used in the seed pipeline runs (fake/pipelines.go).
const seedRunID = "1649271d-6882-4c7f-b6db-20459447d2e8"

// fakeModelJSON returns a model.json matching the AutomlModelSchemaV35 Zod schema.
func fakeModelJSON(modelName string, score float64) string {
	return fmt.Sprintf(`{
  "name": %q,
  "location": {
    "model_directory": "models/%s",
    "predictor": "models/%s/predictor.pkl",
    "notebook": "models/%s/notebook.ipynb",
    "metrics": "models/%s/metrics.json"
  },
  "metrics": {
    "test_data": {
      "accuracy": %.4f,
      "balanced_accuracy": %.4f,
      "f1": %.4f,
      "precision": %.4f,
      "recall": %.4f,
      "r2": %.4f,
      "root_mean_squared_error": %.4f,
      "mean_absolute_error": %.4f,
      "mean_squared_error": %.4f,
      "roc_auc": %.4f,
      "roc_auc_ovo_macro": %.4f
    }
  }
}`, modelName, modelName, modelName, modelName, modelName,
		score, score-0.02, score-0.01, score+0.01, score-0.03,
		score-0.05, 1.0-score, 1.0-score-0.05, (1.0-score)*(1.0-score),
		score+0.02, score+0.01)
}

// fakeFeatureImportanceJSON returns a feature_importance.json for the given model.
func fakeFeatureImportanceJSON(modelName string) string {
	return fmt.Sprintf(`{
  "model_name": %q,
  "importance": {
    "Fare": 0.2841,
    "Age": 0.2156,
    "Sex": 0.1893,
    "Pclass": 0.1247,
    "SibSp": 0.0834,
    "Parch": 0.0521,
    "Embarked": 0.0312,
    "Name": 0.0196
  }
}`, modelName)
}

// runOutputBase is the S3 path prefix for the seed run's output.
var runOutputBase = "autogluon-tabular-training-pipeline/" + seedRunID + "/"
var trainingTaskBase = runOutputBase + "autogluon-models-training-2/"
var execIDBase = trainingTaskBase + "3848043318/"
var modelsArtifactBase = execIDBase + "models_artifact/"

// fakeFiles defines a virtual filesystem per bucket.
var fakeFiles = map[string]map[string][]s3svc.ObjectInfo{
	"automl-data": {
		"": {
			{Key: "automl-test-data-522120.csv", LastModified: "2026-07-13T20:47:03Z", ETag: `"436541b5089ca3f52f261705db6d305e"`, Size: 1869, StorageClass: "STANDARD"},
			{Key: "automl-test-data-522121.csv", LastModified: "2026-06-30T18:01:41Z", ETag: `"436541b5089ca3f52f261705db6d305e"`, Size: 1869, StorageClass: "STANDARD"},
		},
		"automl input data/": {
			{Key: "automl input data/TitanicFullMF.csv", LastModified: "2026-05-12T15:42:08Z", ETag: `"81834b1b4185d3d868494499c575b789"`, Size: 57893, StorageClass: "STANDARD"},
			{Key: "automl input data/ghosts_train.csv", LastModified: "2026-05-12T15:42:07Z", ETag: `"7c163e035b601cfe519f957a5ae70b2a"`, Size: 34499, StorageClass: "STANDARD"},
			{Key: "automl input data/height.csv", LastModified: "2026-05-12T15:42:08Z", ETag: `"519982aa45d21198abe26b2f9261e701"`, Size: 1119, StorageClass: "STANDARD"},
			{Key: "automl input data/mushrooms.csv", LastModified: "2026-05-12T15:42:08Z", ETag: `"d50675801d5d0b2b384522cd74017dd7"`, Size: 1273564, StorageClass: "STANDARD"},
		},
		// model.json files inside each model directory
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
		// Step 1: run-level directories (task directories under the run).
		// Component directories (data-preparation, training) serve component_status.json
		// for the stage-map topology. The autogluon-models-training-2 directory is the
		// actual KFP task output used for model artifact discovery.
		runOutputBase: {
			{Prefix: runOutputBase + "publish-component-stage-map/"},
			{Prefix: runOutputBase + "data-preparation/"},
			{Prefix: runOutputBase + "training/"},
			{Prefix: runOutputBase + "autogluon-models-training-2/"},
		},
		// Step 2: execution-ID directories under the training task
		trainingTaskBase: {
			{Prefix: execIDBase},
		},
		// Step 3: models_artifact directory containing model directories
		modelsArtifactBase: {
			{Prefix: modelsArtifactBase + "WeightedEnsemble_L2_FULL/"},
			{Prefix: modelsArtifactBase + "LightGBM_FULL/"},
			{Prefix: modelsArtifactBase + "CatBoost_FULL/"},
		},
	},
}

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
	lower := strings.ToLower(key)
	if strings.HasSuffix(lower, ".csv") {
		return fakeCSV, "text/csv", true
	}
	if strings.HasSuffix(key, "model.json") {
		return resolveModelJSON(key), "application/json", true
	}
	if strings.HasSuffix(key, "feature_importance.json") {
		return resolveFeatureImportanceJSON(key), "application/json", true
	}
	if strings.HasSuffix(key, "component_stage_map.json") {
		return fakeComponentStageMapJSON, "application/json", true
	}
	if strings.HasSuffix(key, "component_status/component_status.json") {
		return resolveComponentStatusJSON(key), "application/json", true
	}
	if strings.HasSuffix(key, ".json") {
		return "{}", "application/json", true
	}
	return "", "", false
}

// fakeComponentStageMapJSON matches the ComponentStageMap TypeScript type and
// produces the branching DAG layout:
//
//	Prepare data → Split and export → Load data → Model selection
//	                                                    ↓ (fan-out × top_n)
//	                                    Feature engineering → Model training → Stacking → Evaluation → Model N
//	                                                    ↓ (fan-in)
//	                                           Refit and evaluate → Build leaderboard
var fakeComponentStageMapJSON = `{
  "pipeline_id": "33dc7341-9341-4a9a-85e2-ba786f2ebce6",
  "description": "AutoML Tabular Training Pipeline",
  "kfp_run_id": "fake-run",
  "published_at": "2026-07-15T21:41:25Z",
  "components": [
    {
      "id": "data_preparation",
      "description": "Data Preparation",
      "stages": [
        {"id": "prepare_data", "description": "Prepare data"},
        {"id": "split_and_export", "description": "Split and export"}
      ]
    },
    {
      "id": "training",
      "description": "Model Training & Evaluation",
      "stages": [
        {"id": "load_data", "description": "Load data"},
        {"id": "model_selection", "description": "Select models", "steps": ["feature_engineering", "model_training", "stacking", "evaluation"]},
        {"id": "refit_and_evaluate", "description": "Refit and evaluate"},
        {"id": "build_leaderboard", "description": "Build leaderboard"}
      ]
    }
  ]
}`

func (c *S3Client) UploadObject(_ context.Context, _ s3svc.ConnectionOptions, _ s3svc.UploadObjectInput) error {
	return nil
}

func (c *S3Client) ListObjects(_ context.Context, _ s3svc.ConnectionOptions, input s3svc.ListObjectsInput) (*s3svc.ListObjectsResponse, error) {
	bucket := input.Bucket
	prefix := input.Prefix

	contents, prefixes := resolveS3Listing(bucket, prefix)

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
		Name:           bucket,
		Prefix:         prefix,
	}, nil
}

// resolveS3Listing returns files and prefixes for a given bucket/prefix.
// For paths under a pipeline run output directory, it dynamically generates
// the expected directory structure so newly created runs also have output artifacts.
func resolveS3Listing(bucket, prefix string) ([]s3svc.ObjectInfo, []s3svc.CommonPrefix) {
	// Check static entries first
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
	if prefixes, ok := bucketPrefixes[prefix]; ok {
		return []s3svc.ObjectInfo{}, prefixes
	}

	// Dynamic generation for pipeline run output directories.
	// Matches patterns like:
	//   autogluon-tabular-training-pipeline/{runId}/
	//   autogluon-tabular-training-pipeline/{runId}/training/
	//   autogluon-tabular-training-pipeline/{runId}/training/{execId}/
	//   autogluon-tabular-training-pipeline/{runId}/training/{execId}/models_artifact/
	//
	// Prefixes may or may not end with "/" (the frontend's useS3ListFilesQuery
	// and discoverStatusJsonPath omit it). Normalize before generating children.
	for _, pipelinePrefix := range []string{"autogluon-tabular-training-pipeline/", "autogluon-timeseries-training-pipeline/"} {
		if !strings.HasPrefix(prefix, pipelinePrefix) {
			continue
		}
		rel := strings.TrimPrefix(prefix, pipelinePrefix)
		depth := len(strings.Split(strings.TrimSuffix(rel, "/"), "/"))

		base := prefix
		if !strings.HasSuffix(base, "/") {
			base += "/"
		}

		switch depth {
		case 1:
			// {runId}/ → task and component directories.
			// Component dirs (data-preparation, training) serve component_status.json.
			// autogluon-models-training-2 is the actual KFP task output for model discovery.
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
				{Prefix: base + "publish-component-stage-map/"},
				{Prefix: base + "data-preparation/"},
				{Prefix: base + "training/"},
				{Prefix: base + "autogluon-models-training-2/"},
			}
		case 2:
			// {runId}/{task}/ → execution ID directories
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
				{Prefix: base + "3848043318/"},
			}
		case 3:
			// {runId}/{task}/{execId}/ → artifact directories
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
				{Prefix: base + "models_artifact/"},
				{Prefix: base + "component_stage_map/"},
				{Prefix: base + "component_status/"},
			}
		case 4:
			// {runId}/{task}/{execId}/models_artifact/ → model directories
			if strings.Contains(prefix, "models_artifact") {
				return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{
					{Prefix: base + "WeightedEnsemble_L2_FULL/"},
					{Prefix: base + "LightGBM_FULL/"},
					{Prefix: base + "CatBoost_FULL/"},
				}
			}
			return []s3svc.ObjectInfo{}, []s3svc.CommonPrefix{}
		case 5:
			// {runId}/{task}/{execId}/models_artifact/{model}/ → model.json
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

var fakeModelScores = map[string]float64{
	"WeightedEnsemble_L2_FULL": 0.8765,
	"LightGBM_FULL":            0.8543,
	"CatBoost_FULL":            0.8421,
}

func resolveModelJSON(key string) string {
	for modelName, score := range fakeModelScores {
		if strings.Contains(key, modelName) {
			return fakeModelJSON(modelName, score)
		}
	}
	return fakeModelJSON("UnknownModel", 0.5)
}

func resolveFeatureImportanceJSON(key string) string {
	for modelName := range fakeModelScores {
		if strings.Contains(key, modelName) {
			return fakeFeatureImportanceJSON(modelName)
		}
	}
	return fakeFeatureImportanceJSON("UnknownModel")
}

// resolveComponentStatusJSON returns completed per-stage status for a component.
func resolveComponentStatusJSON(key string) string {
	if strings.Contains(key, "data-preparation") {
		return `{
  "component_id": "data_preparation",
  "started_at": "2026-07-15T21:41:25Z",
  "completed_at": "2026-07-15T21:43:00Z",
  "stages": [
    {"id": "prepare_data", "description": "Prepare data", "status": "completed", "timestamp": "2026-07-15T21:41:30Z"},
    {"id": "split_and_export", "description": "Split and export", "status": "completed", "timestamp": "2026-07-15T21:42:30Z"}
  ]
}`
	}
	if strings.Contains(key, "training") {
		return `{
  "component_id": "training",
  "started_at": "2026-07-15T21:43:00Z",
  "completed_at": "2026-07-15T21:51:00Z",
  "stages": [
    {"id": "load_data", "description": "Load data", "status": "completed", "timestamp": "2026-07-15T21:43:10Z"},
    {"id": "model_selection", "description": "Select models", "status": "completed", "timestamp": "2026-07-15T21:44:00Z",
     "selected_models": ["WeightedEnsemble_L2_FULL", "LightGBM_FULL", "CatBoost_FULL"],
     "steps": ["feature_engineering", "model_training", "stacking", "evaluation"]},
    {"id": "refit_and_evaluate", "description": "Refit and evaluate", "status": "completed", "timestamp": "2026-07-15T21:50:00Z"},
    {"id": "build_leaderboard", "description": "Build leaderboard", "status": "completed", "timestamp": "2026-07-15T21:51:00Z"}
  ]
}`
	}
	return "{}"
}
