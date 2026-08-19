package repositories

import (
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidateASCIIColumnNames_TabularRejectsNonASCII(t *testing.T) {
	t.Parallel()

	label := "لديه روح"
	req := models.CreateAutoMLRunRequest{LabelColumn: &label}

	err := ValidateASCIIColumnNames(req, constants.PipelineTypeTabular)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "label_column")
	assert.Contains(t, err.Error(), "ASCII")
}

func TestValidateASCIIColumnNames_TabularAllowsASCII(t *testing.T) {
	t.Parallel()

	label := "target"
	req := models.CreateAutoMLRunRequest{LabelColumn: &label}

	assert.NoError(t, ValidateASCIIColumnNames(req, constants.PipelineTypeTabular))
}

func TestValidateASCIIColumnNames_TimeSeriesRejectsNonASCIIFields(t *testing.T) {
	t.Parallel()

	target := "sales"
	idColumn := "معرف"
	timestampColumn := "date"
	covariates := []string{"promo"}
	req := models.CreateAutoMLRunRequest{
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		KnownCovariatesNames: &covariates,
	}

	err := ValidateASCIIColumnNames(req, constants.PipelineTypeTimeSeries)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "id_column")
}

func TestValidateASCIIColumnNames_TimeSeriesRejectsNonASCIICovariate(t *testing.T) {
	t.Parallel()

	target := "sales"
	idColumn := "store_id"
	timestampColumn := "date"
	covariates := []string{"promo", "متغير"}
	req := models.CreateAutoMLRunRequest{
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		KnownCovariatesNames: &covariates,
	}

	err := ValidateASCIIColumnNames(req, constants.PipelineTypeTimeSeries)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "known_covariates_names")
}
