import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import React from 'react';

type LeaderboardEntry = {
  rank: number;
  model: string;
  accuracy: number;
  balancedAccuracy: number;
  mcc: number;
  rocAuc: number;
  f1: number;
  precision: number;
  recall: number;
  notebook: string;
  predictor: string;
};

function AutomlLeaderboard(): React.JSX.Element {
  // Hardcoded data for one row - will be passed as props later
  const data: LeaderboardEntry[] = [
    {
      rank: 1,
      model: 'WeightedEnsemble_L5_FULL',
      accuracy: 0.801278,
      balancedAccuracy: 0.701657,
      mcc: 0.451217,
      rocAuc: 0.840465,
      f1: 0.566563,
      precision: 0.672794,
      recall: 0.489305,
      notebook:
        's3://nickautorag-donotdelete-pr-wzdxdgpmv9xxbr/autogluon-tabular-training-pipeline/8b070e93-2dea-4d10-977d-d346b45d7401/autogluon-models-full-refit/e2d85720-b36d-481b-b06a-e59ce23ccb68/model_artifact/WeightedEnsemble_L5_FULL/notebooks/automl_predictor_notebook.ipynb',
      predictor:
        's3://nickautorag-donotdelete-pr-wzdxdgpmv9xxbr/autogluon-tabular-training-pipeline/8b070e93-2dea-4d10-977d-d346b45d7401/autogluon-models-full-refit/e2d85720-b36d-481b-b06a-e59ce23ccb68/model_artifact/WeightedEnsemble_L5_FULL/predictor/predictor.pkl',
    },
  ];

  return (
    <Table aria-label="AutoML Model Leaderboard" variant="compact">
      <Thead>
        <Tr>
          <Th>Rank</Th>
          <Th>Model</Th>
          <Th>Accuracy</Th>
          <Th>Balanced Accuracy</Th>
          <Th>MCC</Th>
          <Th>ROC AUC</Th>
          <Th>F1</Th>
          <Th>Precision</Th>
          <Th>Recall</Th>
          <Th>Notebook</Th>
          <Th>Predictor</Th>
        </Tr>
      </Thead>
      <Tbody>
        {data.map((entry) => (
          <Tr key={entry.rank}>
            <Td dataLabel="Rank">{entry.rank}</Td>
            <Td dataLabel="Model">{entry.model}</Td>
            <Td dataLabel="Accuracy">{entry.accuracy.toFixed(6)}</Td>
            <Td dataLabel="Balanced Accuracy">{entry.balancedAccuracy.toFixed(6)}</Td>
            <Td dataLabel="MCC">{entry.mcc.toFixed(6)}</Td>
            <Td dataLabel="ROC AUC">{entry.rocAuc.toFixed(6)}</Td>
            <Td dataLabel="F1">{entry.f1.toFixed(6)}</Td>
            <Td dataLabel="Precision">{entry.precision.toFixed(6)}</Td>
            <Td dataLabel="Recall">{entry.recall.toFixed(6)}</Td>
            <Td dataLabel="Notebook" modifier="truncate">
              {entry.notebook}
            </Td>
            <Td dataLabel="Predictor" modifier="truncate">
              {entry.predictor}
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}

export default AutomlLeaderboard;
