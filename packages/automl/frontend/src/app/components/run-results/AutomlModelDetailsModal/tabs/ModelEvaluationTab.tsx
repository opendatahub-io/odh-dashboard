import React from 'react';
import {
  Bullseye,
  Button,
  Content,
  ContentVariants,
  Divider,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Label,
  Popover,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { ChartLineIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, formatMetricValue, toNumericMetric } from '~/app/utilities/utils';
import { TASK_TYPE_BINARY, TASK_TYPE_MULTICLASS } from '~/app/utilities/const';
import ROCCurveChart, {
  getAucValue,
} from '~/app/components/run-results/AutomlModelDetailsModal/components/ROCCurveChart';

const ROC_TOOLTIP =
  'ROC (Receiver Operating Characteristic) shows how well the model separates classes as the decision threshold changes. The x-axis is false positive rate (1 − specificity); the y-axis is true positive rate (sensitivity). AUC (area under the curve) summarizes ranking quality on holdout data — 1.0 is perfect separation; 0.5 matches random guessing.';

const ROC_DESCRIPTION =
  'Plots true positive rate against false positive rate at each classification threshold.';

const ModelEvaluationTab: React.FC<TabContentProps> = ({
  model,
  taskType,
  curves,
  isArtifactsLoading,
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- defensive: test_data may be missing in malformed model.json
  const metrics = model.metrics.test_data ?? {};
  const entries = Object.entries(metrics);
  const isClassification = taskType === TASK_TYPE_BINARY || taskType === TASK_TYPE_MULTICLASS;

  const renderRocCurve = () => {
    if (isArtifactsLoading) {
      return (
        <Bullseye>
          <Spinner size="lg" aria-label="Loading ROC curve data" />
        </Bullseye>
      );
    }
    if (!curves) {
      return (
        <EmptyState
          data-testid="roc-curve-no-data"
          variant={EmptyStateVariant.sm}
          icon={ChartLineIcon}
          titleText="ROC curve unavailable"
          headingLevel="h4"
        >
          <EmptyStateBody>
            This data may be generated if the training run is submitted again.
          </EmptyStateBody>
        </EmptyState>
      );
    }
    return <ROCCurveChart rocCurveData={curves} />;
  };

  if (entries.length === 0) {
    return <p>No evaluation metrics available for this model.</p>;
  }

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-md">
        Model evaluation measure
      </Title>
      <Table aria-label="Evaluation metrics" variant="compact" className="automl-evaluation-table">
        <Thead>
          <Tr>
            <Th>Measures</Th>
            <Th>Holdout score</Th>
          </Tr>
        </Thead>
        <Tbody>
          {entries.map(([key, value]) => (
            <Tr key={key}>
              <Td dataLabel="Measures">{formatMetricName(key)}</Td>
              <Td dataLabel="Holdout score">{formatMetricValue(toNumericMetric(value))}</Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {isClassification && (
        <>
          <Divider className="pf-v6-u-my-xl" />
          <div data-testid="roc-curve-section" className="automl-roc-curve-section">
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
            >
              <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
                <FlexItem>
                  <Title headingLevel="h3">ROC curve</Title>
                </FlexItem>
                <FlexItem>
                  <Popover bodyContent={ROC_TOOLTIP} position="top">
                    <Button
                      variant="plain"
                      aria-label="ROC curve info"
                      icon={<OutlinedQuestionCircleIcon />}
                    />
                  </Popover>
                </FlexItem>
              </Flex>
              {curves && (
                <FlexItem>
                  <Label>{`AUC = ${getAucValue(curves).toFixed(3)}`}</Label>
                </FlexItem>
              )}
            </Flex>
            <Content component={ContentVariants.p} className="pf-v6-u-mb-md pf-v6-u-color-200">
              {ROC_DESCRIPTION}
            </Content>
            {renderRocCurve()}
          </div>
        </>
      )}
    </>
  );
};

export default ModelEvaluationTab;
