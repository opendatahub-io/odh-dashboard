package repositories

import (
	"context"
	"fmt"
	"testing"
	"time"

	"github.com/opendatahub-io/mlflow-go/mlflow/tracking"
	"github.com/opendatahub-io/mlflow/bff/internal/constants"
	mlflowpkg "github.com/opendatahub-io/mlflow/bff/internal/integrations/mlflow"
	"github.com/stretchr/testify/assert"
	tmock "github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func contextWithMockClient(client mlflowpkg.ClientInterface) context.Context {
	return context.WithValue(context.Background(), constants.MLflowClientKey, client)
}

func TestListExperimentsSuccess(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}
	now := time.Date(2024, 1, 15, 10, 30, 0, 0, time.UTC)

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 0
	})).Return(&tracking.ExperimentList{
		Experiments: []tracking.Experiment{
			{
				ID:               "0",
				Name:             "Default",
				ArtifactLocation: "s3://mlflow/0",
				LifecycleStage:   "active",
				Tags:             map[string]string{"env": "prod"},
				CreationTime:     now,
				LastUpdateTime:   now,
			},
		},
		NextPageToken: "next",
	}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListExperiments(ctx, "", 0, "")

	require.NoError(t, err)
	require.Len(t, result.Experiments, 1)
	assert.Equal(t, "0", result.Experiments[0].ID)
	assert.Equal(t, "Default", result.Experiments[0].Name)
	assert.Equal(t, "s3://mlflow/0", result.Experiments[0].ArtifactLocation)
	assert.Equal(t, "active", result.Experiments[0].LifecycleStage)
	assert.Equal(t, map[string]string{"env": "prod"}, result.Experiments[0].Tags)
	assert.Equal(t, now, result.Experiments[0].CreationTime)
	assert.Equal(t, now, result.Experiments[0].LastUpdateTime)
	assert.Equal(t, "next", result.NextPageToken)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsEmptyResult(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 0
	})).Return(&tracking.ExperimentList{
		Experiments: []tracking.Experiment{},
	}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListExperiments(ctx, "", 0, "")

	require.NoError(t, err)
	assert.Empty(t, result.Experiments)
	assert.Empty(t, result.NextPageToken)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsNoOptionsWhenParamsEmpty(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 0
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "", 0, "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsWithPageToken(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 1 // pageToken only
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "page2", 0, "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsWithMaxResults(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 1 // maxResults only
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "", 25, "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsWithFilter(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 1 // filter only
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "", 0, "name LIKE 'test%'")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsAllOptionsSet(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 3 // pageToken + maxResults + filter
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "token", 50, "name = 'test'")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}

func TestListExperimentsClientError(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.Anything).
		Return(nil, fmt.Errorf("connection refused"))

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	result, err := repo.ListExperiments(ctx, "", 0, "")

	assert.Nil(t, result)
	assert.EqualError(t, err, "searching experiments: connection refused")
	mockClient.AssertExpectations(t)
}

func TestListExperimentsMissingClientInContext(t *testing.T) {
	repo := NewExperimentsRepository()
	ctx := context.Background()

	result, err := repo.ListExperiments(ctx, "", 0, "")

	assert.Nil(t, result)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "missing MLflow client in context")
}

func TestListExperimentsZeroMaxResultsNotAdded(t *testing.T) {
	mockClient := &mlflowpkg.MockClient{}

	mockClient.On("SearchExperiments", tmock.Anything, tmock.MatchedBy(func(opts []tracking.SearchExperimentsOption) bool {
		return len(opts) == 1 // pageToken only, maxResults=0 is skipped
	})).Return(&tracking.ExperimentList{Experiments: []tracking.Experiment{}}, nil)

	repo := NewExperimentsRepository()
	ctx := contextWithMockClient(mockClient)

	_, err := repo.ListExperiments(ctx, "tok", 0, "")

	require.NoError(t, err)
	mockClient.AssertExpectations(t)
}
