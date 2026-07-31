package repositories

import (
	"fmt"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
)

func containsNonASCII(s string) bool {
	for _, r := range s {
		if r > 0x7F {
			return true
		}
	}
	return false
}

// ValidateASCIIColumnNames rejects non-ASCII column names. Kubeflow Pipelines
// MySQL-backed deployments reject multibyte UTF-8 in PipelineRuntimeManifest /
// WorkflowRuntimeManifest, so AutoML blocks these names instead of rewriting CSVs.
func ValidateASCIIColumnNames(req models.CreateAutoMLRunRequest, pipelineType string) error {
	check := func(field, name string) error {
		if name == "" || !containsNonASCII(name) {
			return nil
		}
		return NewValidationError(fmt.Sprintf(
			"%s %q must contain only ASCII characters because Kubeflow Pipelines does not support non-ASCII column names",
			field, name,
		))
	}

	switch pipelineType {
	case constants.PipelineTypeTabular:
		if req.LabelColumn != nil {
			if err := check("label_column", *req.LabelColumn); err != nil {
				return err
			}
		}
	case constants.PipelineTypeTimeSeries:
		if req.Target != nil {
			if err := check("target", *req.Target); err != nil {
				return err
			}
		}
		if req.IDColumn != nil {
			if err := check("id_column", *req.IDColumn); err != nil {
				return err
			}
		}
		if req.TimestampColumn != nil {
			if err := check("timestamp_column", *req.TimestampColumn); err != nil {
				return err
			}
		}
		if req.KnownCovariatesNames != nil {
			for _, name := range *req.KnownCovariatesNames {
				if err := check("known_covariates_names", name); err != nil {
					return err
				}
			}
		}
	}

	return nil
}
