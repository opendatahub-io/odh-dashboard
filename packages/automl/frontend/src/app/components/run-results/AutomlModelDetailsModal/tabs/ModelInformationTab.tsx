import React from 'react';
import {
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
} from '@patternfly/react-core';
import type { TabContentProps } from '~/app/components/run-results/AutomlModelDetailsModal/tabConfig';
import { PRESET_LABELS } from '~/app/utilities/const';
import { formatMetricName, resolveEvalMetric } from '~/app/utilities/utils';

/** Keys excluded from the parameter list (not useful as model-level metadata). */
const HIDDEN_KEYS = new Set([
  'display_name',
  'description',
  'task_type',
  'train_data_secret_name',
  'train_data_bucket_name',
  'train_data_file_key',
  'eval_metric',
]);

const ModelInformationTab: React.FC<TabContentProps> = ({ taskType, parameters, createdAt }) => {
  const paramEntries = React.useMemo(() => {
    const entries = Object.entries(parameters ?? {}).filter(([key, value]) => {
      if (HIDDEN_KEYS.has(key) || value === '') {
        return false;
      }
      return !Array.isArray(value) || value.length > 0;
    });
    const evalMetric = resolveEvalMetric(parameters?.eval_metric, taskType);
    entries.push(['Evaluation metric', formatMetricName(evalMetric)]);

    const createdDate = createdAt ? new Date(createdAt) : null;
    const isValidDate = createdDate && !Number.isNaN(createdDate.getTime());
    entries.push(['Created on', isValidDate ? createdDate.toLocaleString() : '-']);

    return entries;
  }, [parameters, taskType, createdAt]);

  const maxTermWidth = React.useMemo(
    () => paramEntries.reduce((max, [key]) => Math.max(max, formatMetricName(key).length), 0),
    [paramEntries],
  );

  // Workaround for PF v6.4.0 bug: termWidth prop sets wrong CSS variable name
  // Should be fixed in future PF version, then we can use: termWidth={`${maxTermWidth}ch`}
  // Cap at 50% to prevent extreme parameter names from breaking layout
  const customStyle: Record<string, string> = {
    '--pf-v6-c-description-list__term--width': `min(${maxTermWidth}ch, 50%)`,
  };

  return (
    <>
      <Title headingLevel="h3" className="pf-v6-u-mb-lg">
        Experiment parameters
      </Title>
      <DescriptionList
        isHorizontal
        isCompact
        className="automl-model-info-list"
        style={customStyle}
      >
        {paramEntries.map(([key, value]) => (
          <DescriptionListGroup key={key}>
            <DescriptionListTerm>{formatMetricName(key)}</DescriptionListTerm>
            <DescriptionListDescription>
              {key === 'preset' && typeof value === 'string'
                ? (PRESET_LABELS[value] ?? String(value))
                : String(value)}
            </DescriptionListDescription>
          </DescriptionListGroup>
        ))}
      </DescriptionList>
    </>
  );
};

export default ModelInformationTab;
