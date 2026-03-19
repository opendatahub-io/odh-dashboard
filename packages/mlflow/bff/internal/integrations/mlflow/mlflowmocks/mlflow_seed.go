package mlflowmocks

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow"
	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
)

const seedTimeout = 30 * time.Second

// SeedExperimentsAndRuns populates the local MLflow instance with sample
// experiments and runs so that contract tests and dev workflows have data.
// The dataset mirrors the static mock (StaticMockClient) for consistency
// across modes.
func SeedExperimentsAndRuns(trackingURI string, logger *slog.Logger) error {
	client, err := mlflow.NewClient(
		mlflow.WithTrackingURI(trackingURI),
		mlflow.WithInsecure(),
	)
	if err != nil {
		return fmt.Errorf("failed to create MLflow client: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), seedTimeout)
	defer cancel()

	tr := client.Tracking()

	experiments := seedData()

	for _, exp := range experiments {
		expID, createErr := tr.CreateExperiment(ctx, exp.name,
			tracking.WithExperimentTags(exp.tags),
		)
		if createErr != nil {
			return fmt.Errorf("failed to create experiment %s: %w", exp.name, createErr)
		}
		logger.Debug("Seeded experiment", slog.String("name", exp.name), slog.String("id", expID))

		for _, run := range exp.runs {
			created, runErr := tr.CreateRun(ctx, expID,
				tracking.WithRunName(run.name),
				tracking.WithRunTags(run.tags),
			)
			if runErr != nil {
				return fmt.Errorf("failed to create run %s: %w", run.name, runErr)
			}

			if err := tr.LogBatch(ctx, created.Info.RunID, run.metrics, run.params, nil); err != nil {
				return fmt.Errorf("failed to log batch for run %s: %w", run.name, err)
			}

			endTime := time.Now()
			if _, err := tr.UpdateRun(ctx, created.Info.RunID,
				tracking.WithStatus(tracking.RunStatusFinished),
				tracking.WithEndTime(endTime),
			); err != nil {
				return fmt.Errorf("failed to finish run %s: %w", run.name, err)
			}

			logger.Debug("Seeded run",
				slog.String("name", run.name),
				slog.String("runID", created.Info.RunID),
			)
		}
	}

	logger.Info("Seeded MLflow with sample experiments and runs",
		slog.Int("experiments", len(experiments)),
	)
	return nil
}

type seedExperiment struct {
	name string
	tags map[string]string
	runs []seedRun
}

type seedRun struct {
	name    string
	tags    map[string]string
	metrics []tracking.Metric
	params  []tracking.Param
}

func seedData() []seedExperiment {
	return []seedExperiment{
		{
			name: "fraud-detection-classifier",
			tags: map[string]string{"team": "ml-platform", "project": "fraud-detection", "priority": "high"},
			runs: []seedRun{
				{
					name: "xgboost-baseline",
					tags: map[string]string{"mlflow.runName": "xgboost-baseline"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.94, Step: 1},
						{Key: "f1_score", Value: 0.91, Step: 1},
						{Key: "precision", Value: 0.93, Step: 1},
						{Key: "recall", Value: 0.89, Step: 1},
						{Key: "auc_roc", Value: 0.97, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "xgboost"},
						{Key: "n_estimators", Value: "200"},
						{Key: "max_depth", Value: "6"},
						{Key: "learning_rate", Value: "0.1"},
					},
				},
				{
					name: "random-forest-v1",
					tags: map[string]string{"mlflow.runName": "random-forest-v1"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.92, Step: 1},
						{Key: "f1_score", Value: 0.88, Step: 1},
						{Key: "precision", Value: 0.90, Step: 1},
						{Key: "recall", Value: 0.86, Step: 1},
						{Key: "auc_roc", Value: 0.95, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "random_forest"},
						{Key: "n_estimators", Value: "500"},
						{Key: "max_depth", Value: "12"},
						{Key: "min_samples_split", Value: "5"},
					},
				},
				{
					name: "xgboost-tuned",
					tags: map[string]string{"mlflow.runName": "xgboost-tuned"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.96, Step: 1},
						{Key: "f1_score", Value: 0.94, Step: 1},
						{Key: "precision", Value: 0.95, Step: 1},
						{Key: "recall", Value: 0.93, Step: 1},
						{Key: "auc_roc", Value: 0.98, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "xgboost"},
						{Key: "n_estimators", Value: "500"},
						{Key: "max_depth", Value: "8"},
						{Key: "learning_rate", Value: "0.05"},
						{Key: "subsample", Value: "0.8"},
					},
				},
			},
		},
		{
			name: "demand-forecasting-regression",
			tags: map[string]string{"team": "data-science", "project": "supply-chain"},
			runs: []seedRun{
				{
					name: "linear-baseline",
					tags: map[string]string{"mlflow.runName": "linear-baseline"},
					metrics: []tracking.Metric{
						{Key: "rmse", Value: 12.34, Step: 1},
						{Key: "mae", Value: 8.21, Step: 1},
						{Key: "r2", Value: 0.82, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "linear_regression"},
						{Key: "alpha", Value: "0.01"},
						{Key: "fit_intercept", Value: "true"},
					},
				},
				{
					name: "lightgbm-v1",
					tags: map[string]string{"mlflow.runName": "lightgbm-v1"},
					metrics: []tracking.Metric{
						{Key: "rmse", Value: 7.89, Step: 1},
						{Key: "mae", Value: 5.43, Step: 1},
						{Key: "r2", Value: 0.91, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "lightgbm"},
						{Key: "num_leaves", Value: "31"},
						{Key: "learning_rate", Value: "0.05"},
						{Key: "n_estimators", Value: "300"},
					},
				},
			},
		},
		{
			name: "sentiment-analysis-nlp",
			tags: map[string]string{"team": "nlp", "project": "customer-feedback", "framework": "transformers"},
			runs: []seedRun{
				{
					name: "bert-base-finetune",
					tags: map[string]string{"mlflow.runName": "bert-base-finetune"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.89, Step: 1},
						{Key: "f1_score", Value: 0.87, Step: 1},
						{Key: "loss", Value: 0.31, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "bert-base-uncased"},
						{Key: "epochs", Value: "3"},
						{Key: "batch_size", Value: "32"},
						{Key: "learning_rate", Value: "2e-5"},
					},
				},
				{
					name: "distilbert-finetune",
					tags: map[string]string{"mlflow.runName": "distilbert-finetune"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.87, Step: 1},
						{Key: "f1_score", Value: 0.85, Step: 1},
						{Key: "loss", Value: 0.35, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "distilbert-base-uncased"},
						{Key: "epochs", Value: "5"},
						{Key: "batch_size", Value: "64"},
						{Key: "learning_rate", Value: "3e-5"},
					},
				},
				{
					name: "roberta-large",
					tags: map[string]string{"mlflow.runName": "roberta-large"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.92, Step: 1},
						{Key: "f1_score", Value: 0.91, Step: 1},
						{Key: "loss", Value: 0.22, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "roberta-large"},
						{Key: "epochs", Value: "3"},
						{Key: "batch_size", Value: "16"},
						{Key: "learning_rate", Value: "1e-5"},
					},
				},
			},
		},
		{
			name: "image-classification-cnn",
			tags: map[string]string{"team": "computer-vision", "project": "product-catalog"},
			runs: []seedRun{
				{
					name: "resnet50-transfer",
					tags: map[string]string{"mlflow.runName": "resnet50-transfer"},
					metrics: []tracking.Metric{
						{Key: "accuracy", Value: 0.93, Step: 1},
						{Key: "top5_accuracy", Value: 0.99, Step: 1},
						{Key: "loss", Value: 0.19, Step: 1},
					},
					params: []tracking.Param{
						{Key: "model", Value: "resnet50"},
						{Key: "pretrained", Value: "true"},
						{Key: "epochs", Value: "10"},
						{Key: "optimizer", Value: "adam"},
					},
				},
			},
		},
		{
			name: "env-local-mlflow",
			tags: map[string]string{"source": "go-seeder", "description": "Identifies this as the local MLflow (uv/Python) environment"},
			runs: []seedRun{
				{
					name:    "marker-run",
					tags:    map[string]string{"mlflow.runName": "marker-run"},
					metrics: []tracking.Metric{{Key: "seeded", Value: 1, Step: 1}},
					params:  []tracking.Param{{Key: "purpose", Value: "env-marker"}},
				},
			},
		},
	}
}
