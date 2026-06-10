import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { formatMetricName, getOptimizedMetricForTask } from '~/app/utilities/utils';

/** Keys excluded from the parameter list (not useful as model-level metadata). */
const HIDDEN_KEYS = new Set([
  'display_name',
  'description',
  'task_type',
  'train_data_secret_name',
  'train_data_bucket_name',
  'train_data_file_key',
]);

const ModelInformationTab: React.FC<TabContentProps> = ({ taskType, parameters, createdAt }) => {
  const paramEntries = Object.entries(parameters ?? {}).filter(([key, value]) => {
    if (HIDDEN_KEYS.has(key) || value === '') {
      return false;
    }
    return !Array.isArray(value) || value.length > 0;
  });
  const evalMetric = getOptimizedMetricForTask(taskType);

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-lg">
        Experiment parameters
      </Title>
      <DescriptionList isHorizontal isCompact className="automl-model-info-list">
        {paramEntries.map(([key, value]) => (
          <DescriptionListGroup key={key}>
            <DescriptionListTerm>{formatMetricName(key)}</DescriptionListTerm>
            <DescriptionListDescription>{String(value)}</DescriptionListDescription>
          </DescriptionListGroup>
        ))}
        <DescriptionListGroup>
          <DescriptionListTerm>Evaluation metric</DescriptionListTerm>
          <DescriptionListDescription>{formatMetricName(evalMetric)}</DescriptionListDescription>
        </DescriptionListGroup>
        <DescriptionListGroup>
          <DescriptionListTerm>Created on</DescriptionListTerm>
          <DescriptionListDescription>
            {createdAt ? new Date(createdAt).toLocaleString() : '-'}
          </DescriptionListDescription>
        </DescriptionListGroup>
      </DescriptionList>
    </>
  );
};

export default ModelInformationTab;
