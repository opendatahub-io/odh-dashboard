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

func TestApplyKFPColumnAliasMap_UpdatesLabelAndFileKey(t *testing.T) {
	t.Parallel()

	arabic := "لديه روح"
	aliases := BuildKFPColumnAliasMap([]string{arabic})
	label := arabic
	req := models.CreateAutoMLRunRequest{
		LabelColumn:      &label,
		TrainDataFileKey: "arabicghosts_train-3.csv",
	}

	updated := ApplyKFPColumnAliasMap(req, aliases, constants.PipelineTypeTabular, "arabicghosts_train-3.automl-ascii.csv")
	require.NotNil(t, updated.LabelColumn)
	assert.Equal(t, aliases[arabic], *updated.LabelColumn)
	assert.Equal(t, "arabicghosts_train-3.automl-ascii.csv", updated.TrainDataFileKey)
}

func TestDeriveASCIICompatibleCSVKey(t *testing.T) {
	t.Parallel()

	assert.Equal(t, "data.automl-ascii.csv", DeriveASCIICompatibleCSVKey("data.csv"))
	assert.Equal(t, "arabicghosts_train-3.automl-ascii.csv", DeriveASCIICompatibleCSVKey("arabicghosts_train-3.csv"))
}
