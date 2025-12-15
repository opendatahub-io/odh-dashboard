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
import { formatDuration, formatMetricLabel, formatMetricValue, getTrainerStatus } from './utils';
import { TrainJobKind } from '../../k8sTypes';

type TrainingJobDetailsTabProps = {
  job: TrainJobKind;
};

const TrainingJobDetailsTab: React.FC<TrainingJobDetailsTabProps> = ({ job }) => {
  const trainerStatus = getTrainerStatus(job);

  // Progress information
  const estimatedTimeRemaining =
    trainerStatus?.estimatedRemainingSeconds != null
      ? formatDuration(trainerStatus.estimatedRemainingSeconds)
      : '-';

  const currentSteps = trainerStatus?.currentStep ?? '-';
  const totalSteps = trainerStatus?.totalSteps ?? '-';
  const currentEpochs = trainerStatus?.currentEpoch ?? '-';
  const totalEpochs = trainerStatus?.totalEpochs ?? '-';

  // Collect all metrics dynamically from trainMetrics and evalMetrics
  const allMetricEntries = [
    ...Object.entries(trainerStatus?.trainMetrics ?? {}),
    ...Object.entries(trainerStatus?.evalMetrics ?? {}),
  ];

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
      {allMetricEntries.length > 0 && (
        <StackItem className="pf-v6-u-mt-md pf-v6-u-mb-md">
          <DescriptionList isHorizontal>
            <Title headingLevel="h3" size="md" data-testid="metrics-section">
              Metrics
            </Title>
            {allMetricEntries.map(([key, value]) => (
              <DescriptionListGroup key={key}>
                <DescriptionListTerm style={{ fontWeight: 'normal' }}>
                  {formatMetricLabel(key)}:
                </DescriptionListTerm>
                <DescriptionListDescription data-testid={`metric-${key}-value`}>
                  {formatMetricValue(value)}
                </DescriptionListDescription>
              </DescriptionListGroup>
            ))}
          </DescriptionList>
        </StackItem>
      )}
    </Stack>
  );
};

export default TrainingJobDetailsTab;
