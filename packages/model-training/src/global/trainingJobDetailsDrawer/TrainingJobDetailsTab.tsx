import * as React from 'react';
import {
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  Title,
  StackItem,
  Stack,
} from '@patternfly/react-core';
import { TrainJobKind } from '../../k8sTypes';

type TrainingJobDetailsTabProps = {
  job: TrainJobKind;
};

const TrainingJobDetailsTab: React.FC<TrainingJobDetailsTabProps> = ({ job }) => {
  const trainerStatus = job.status?.trainerStatus;

  // Progress information
  const estimatedTimeRemaining =
    trainerStatus?.estimatedRemainingTimeSummary ||
    (trainerStatus?.estimatedRemainingDurationSeconds
      ? `${Math.round(trainerStatus.estimatedRemainingDurationSeconds / 60)} minutes`
      : '-');

  const currentSteps = trainerStatus?.currentStep ?? '-';
  const totalSteps = trainerStatus?.totalSteps ?? '-';
  const currentEpochs = trainerStatus?.currentEpoch ?? '-';
  const totalEpochs = trainerStatus?.totalEpochs ?? '-';

  // Metrics - combine train and eval metrics
  const allMetrics = {
    ...trainerStatus?.trainMetrics,
    ...trainerStatus?.evalMetrics,
  };

  // Extract common metrics (case-insensitive lookup)
  const getMetric = (name: string): string => {
    const key = Object.keys(allMetrics).find((k) => k.toLowerCase() === name.toLowerCase());
    return key ? allMetrics[key].toString() : '-';
  };

  const loss = getMetric('loss');
  const accuracy = getMetric('accuracy');
  const totalBatches =
    getMetric('total_batches') !== '-' ? getMetric('total_batches') : getMetric('batches');
  const totalSamples =
    getMetric('total_samples') !== '-' ? getMetric('total_samples') : getMetric('samples');

  return (
    <Stack hasGutter>
      <StackItem className="pf-v6-u-mt-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="progress-section">
            Progress
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Estimated time remaining
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="estimated-time-remaining-value">
              {estimatedTimeRemaining}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Steps:</DescriptionListTerm>
            <DescriptionListDescription data-testid="steps-value">
              {typeof currentSteps === 'number' ? currentSteps : '-'} / {totalSteps}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Epochs:</DescriptionListTerm>
            <DescriptionListDescription data-testid="epochs-value">
              {currentEpochs} / {totalEpochs}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
      <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
        <DescriptionList isHorizontal>
          <Title headingLevel="h3" size="md" data-testid="metrics-section">
            Metrics
          </Title>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Loss:</DescriptionListTerm>
            <DescriptionListDescription data-testid="loss-value">{loss}</DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>Accuracy:</DescriptionListTerm>
            <DescriptionListDescription data-testid="accuracy-value">
              {accuracy}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Total batches:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="total-batches-value">
              {totalBatches}
            </DescriptionListDescription>
          </DescriptionListGroup>
          <DescriptionListGroup>
            <DescriptionListTerm style={{ fontWeight: 'normal' }}>
              Total samples:
            </DescriptionListTerm>
            <DescriptionListDescription data-testid="total-samples-value">
              {totalSamples}
            </DescriptionListDescription>
          </DescriptionListGroup>
        </DescriptionList>
      </StackItem>
    </Stack>
  );
};

export default TrainingJobDetailsTab;
