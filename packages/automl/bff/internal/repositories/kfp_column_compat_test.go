package repositories

import (
	"testing"

	"github.com/opendatahub-io/automl-library/bff/internal/constants"
	"github.com/opendatahub-io/automl-library/bff/internal/models"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCollectNonASCIIKFPColumnNames_Tabular(t *testing.T) {
	t.Parallel()

	label := "لديه روح"
	req := models.CreateAutoMLRunRequest{
		LabelColumn: &label,
	}

	names := CollectNonASCIIKFPColumnNames(req, constants.PipelineTypeTabular)
	assert.Equal(t, []string{label}, names)
}

func TestCollectNonASCIIKFPColumnNames_ASCIIOnly(t *testing.T) {
	t.Parallel()

	label := "target"
	req := models.CreateAutoMLRunRequest{
		LabelColumn: &label,
	}

	assert.Empty(t, CollectNonASCIIKFPColumnNames(req, constants.PipelineTypeTabular))
}

func TestCollectNonASCIIKFPColumnNames_TimeSeries(t *testing.T) {
	t.Parallel()

	target := "هدف"
	idColumn := "معرف"
	timestampColumn := "وقت"
	covariateA := "متغير"
	covariateB := "آخر"
	covariates := []string{covariateA, covariateB}
	req := models.CreateAutoMLRunRequest{
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		KnownCovariatesNames: &covariates,
	}

	names := CollectNonASCIIKFPColumnNames(req, constants.PipelineTypeTimeSeries)
	assert.Equal(t, []string{target, idColumn, timestampColumn, covariateA, covariateB}, names)
}

func TestCollectNonASCIIKFPColumnNames_TimeSeries_ASCIIOnly(t *testing.T) {
	t.Parallel()

	target := "sales"
	idColumn := "store_id"
	timestampColumn := "date"
	covariates := []string{"promo", "weather"}
	req := models.CreateAutoMLRunRequest{
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		KnownCovariatesNames: &covariates,
	}

	assert.Empty(t, CollectNonASCIIKFPColumnNames(req, constants.PipelineTypeTimeSeries))
}

func TestCollectNonASCIIKFPColumnNames_TimeSeries_Deduplicates(t *testing.T) {
	t.Parallel()

	shared := "هدف"
	covariates := []string{shared}
	req := models.CreateAutoMLRunRequest{
		Target:               &shared,
		KnownCovariatesNames: &covariates,
	}

	names := CollectNonASCIIKFPColumnNames(req, constants.PipelineTypeTimeSeries)
	assert.Equal(t, []string{shared}, names)
}

func TestRewriteCSVHeaderNames_ArabicLabelColumn(t *testing.T) {
	t.Parallel()

	arabic := "لديه روح"
	aliases := BuildKFPColumnAliasMap([]string{arabic})
	csvData := []byte("لديه روح,feature\nyes,1\nno,0\n")

	rewritten, err := RewriteCSVHeaderNames(csvData, aliases)
	require.NoError(t, err)

	assert.NotContains(t, string(rewritten), arabic)
	assert.Contains(t, string(rewritten), aliases[arabic])
	assert.Contains(t, string(rewritten), "feature")
}

func TestRewriteCSVHeaderNames_NoMatchingHeaderColumn(t *testing.T) {
	t.Parallel()

	aliases := BuildKFPColumnAliasMap([]string{"لديه روح"})
	csvData := []byte("feature,other\n1,2\n")

	_, err := RewriteCSVHeaderNames(csvData, aliases)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "CSV header does not contain the requested non-ASCII column names")
}

func TestApplyKFPColumnAliasMap_UpdatesLabelAndFileKey(t *testing.T) {
	t.Parallel()

	arabic := "لديه روح"
	aliases := BuildKFPColumnAliasMap([]string{arabic})
	label := arabic
	req := models.CreateAutoMLRunRequest{
		LabelColumn:      &label,
		TrainDataFileKey: "arabicghosts_train-3.csv",
	}

	updated := ApplyKFPColumnAliasMap(req, aliases, constants.PipelineTypeTabular, DeriveASCIICompatibleCSVKey("arabicghosts_train-3.csv", []byte("rewritten")))
	require.NotNil(t, updated.LabelColumn)
	assert.Equal(t, aliases[arabic], *updated.LabelColumn)
	assert.Equal(t, DeriveASCIICompatibleCSVKey("arabicghosts_train-3.csv", []byte("rewritten")), updated.TrainDataFileKey)
	assert.Equal(t, map[string]string(aliases), updated.ColumnAliasMap)
}

func TestApplyKFPColumnAliasMap_TimeSeries(t *testing.T) {
	t.Parallel()

	target := "هدف"
	idColumn := "معرف"
	timestampColumn := "وقت"
	covariateA := "متغير"
	covariateB := "promo"
	covariates := []string{covariateA, covariateB}
	aliases := BuildKFPColumnAliasMap([]string{target, idColumn, timestampColumn, covariateA})

	req := models.CreateAutoMLRunRequest{
		Target:               &target,
		IDColumn:             &idColumn,
		TimestampColumn:      &timestampColumn,
		KnownCovariatesNames: &covariates,
		TrainDataFileKey:     "ts/train.csv",
	}

	asciiKey := DeriveASCIICompatibleCSVKey("ts/train.csv", []byte("rewritten"))
	updated := ApplyKFPColumnAliasMap(req, aliases, constants.PipelineTypeTimeSeries, asciiKey)

	require.NotNil(t, updated.Target)
	require.NotNil(t, updated.IDColumn)
	require.NotNil(t, updated.TimestampColumn)
	require.NotNil(t, updated.KnownCovariatesNames)
	assert.Equal(t, aliases[target], *updated.Target)
	assert.Equal(t, aliases[idColumn], *updated.IDColumn)
	assert.Equal(t, aliases[timestampColumn], *updated.TimestampColumn)
	assert.Equal(t, []string{aliases[covariateA], covariateB}, *updated.KnownCovariatesNames)
	assert.Equal(t, asciiKey, updated.TrainDataFileKey)
	assert.Equal(t, map[string]string(aliases), updated.ColumnAliasMap)
}

func TestDeriveASCIICompatibleCSVKey(t *testing.T) {
	t.Parallel()

	content := []byte("col1,col2\n1,2\n")
	key := DeriveASCIICompatibleCSVKey("data.csv", content)
	assert.Contains(t, key, ".automl-ascii.")
	assert.Contains(t, key, ".csv")
	assert.Equal(t, key, DeriveASCIICompatibleCSVKey("data.csv", content))
	assert.NotEqual(t, key, DeriveASCIICompatibleCSVKey("data.csv", []byte("other")))

	t.Run("empty original key", func(t *testing.T) {
		t.Parallel()
		derived := DeriveASCIICompatibleCSVKey("", content)
		assert.Regexp(t, `^automl-ascii\.[0-9a-f]{12}\.csv$`, derived)
		assert.Equal(t, derived, DeriveASCIICompatibleCSVKey("", content))
	})

	t.Run("filename without extension", func(t *testing.T) {
		t.Parallel()
		derived := DeriveASCIICompatibleCSVKey("data/train", content)
		assert.Contains(t, derived, "data/train.automl-ascii.")
		assert.NotContains(t, derived, ".csv")
		assert.Equal(t, derived, DeriveASCIICompatibleCSVKey("data/train", content))
	})
}
