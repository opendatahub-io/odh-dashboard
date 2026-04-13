import React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Content,
  Divider,
  Skeleton,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { TASK_TYPE_LABELS, TASK_TYPE_TIMESERIES } from '~/app/utilities/const';
import './AutomlInputParametersPanel.scss';

/** Keys excluded from the drawer because they are already shown elsewhere on the page. */
const EXCLUDED_KEYS = new Set(['display_name']);

/** Keys that only apply to tabular task types (binary, multiclass, regression). */
const TABULAR_ONLY_KEYS = new Set(['label_column']);

/** Keys that only apply to the timeseries task type. */
const TIMESERIES_ONLY_KEYS = new Set([
  'target',
  'id_column',
  'timestamp_column',
  'prediction_length',
  'known_covariates_names',
]);

/**
 * Ordered parameter definitions with human-readable labels.
 * Controls display order in the drawer panel.
 * Unknown keys appear at the end with a formatted version of the key name.
 */
/* eslint-disable camelcase */
const PANEL_PARAMETERS: { key: string; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'train_data_secret_name', label: 'S3 connection' },
  { key: 'train_data_bucket_name', label: 'S3 connection bucket' },
  { key: 'train_data_file_key', label: 'Selected files' },
  { key: 'task_type', label: 'Prediction type' },
  { key: 'label_column', label: 'Label column' },
  { key: 'target', label: 'Target column' },
  { key: 'timestamp_column', label: 'Timestamp column' },
  { key: 'id_column', label: 'ID column' },
  { key: 'known_covariates_names', label: 'Known covariates' },
  { key: 'prediction_length', label: 'Prediction length' },
  { key: 'top_n', label: 'Top models to consider' },
];

const PARAMETER_LABELS: Record<string, string> = Object.fromEntries(
  PANEL_PARAMETERS.map(({ key, label }) => [key, label]),
);

const ORDERED_KEYS = PANEL_PARAMETERS.map(({ key }) => key);

/**
 * Converts a snake_case key into a human-readable label.
 * Uses the known label map first, falling back to title-casing the key.
 */
const getParameterLabel = (key: string): string => {
  if (PARAMETER_LABELS[key]) {
    return PARAMETER_LABELS[key];
  }
  const words = key.split('_');
  return words
    .map((word, i) => (i === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(' ');
};

const formatValue = (key: string, value: unknown): React.ReactNode => {
  if (value == null || value === '') {
    return '-';
  }
  if (key === 'task_type' && typeof value === 'string') {
    return TASK_TYPE_LABELS[value] ?? value;
  }
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value);
};

/** Returns true if a value is considered empty and should be hidden from the panel. */
const isEmptyValue = (value: unknown): boolean =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0);

type AutomlInputParametersPanelProps = {
  onClose: () => void;
  parameters?: Partial<ConfigureSchema>;
  isLoading?: boolean;
};

const AutomlInputParametersPanel: React.FC<AutomlInputParametersPanelProps> = ({
  onClose,
  parameters,
  isLoading,
}) => {
  const entries: [string, unknown][] = React.useMemo(() => {
    if (!parameters) {
      return [];
    }
    const allEntries: [string, unknown][] = Object.entries(parameters);
    const valueByKey = new Map(allEntries);
    const knownKeySet = new Set([...ORDERED_KEYS, ...EXCLUDED_KEYS]);

    // Determine which keys to hide based on the current task type
    const isTimeseries = parameters.task_type === TASK_TYPE_TIMESERIES;
    const hiddenKeys = isTimeseries ? TABULAR_ONLY_KEYS : TIMESERIES_ONLY_KEYS;

    // Build entries in the display order defined by PANEL_PARAMETERS, skipping empty values
    // and keys that don't apply to the current task type
    const knownEntries: [string, unknown][] = ORDERED_KEYS.filter(
      (key) => valueByKey.has(key) && !isEmptyValue(valueByKey.get(key)) && !hiddenKeys.has(key),
    ).map((key) => [key, valueByKey.get(key)]);

    // Append any unexpected keys (e.g. new API fields) at the end
    const unknownEntries = allEntries.filter(
      ([key, value]) => !knownKeySet.has(key) && !isEmptyValue(value),
    );
    return [...knownEntries, ...unknownEntries];
  }, [parameters]);

  return (
    <DrawerPanelContent minSize="320px" data-testid="run-details-drawer-panel">
      <DrawerHead className="odh-automl-input-parameters-panel__head">
        <Title headingLevel="h2">Run details</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} data-testid="run-details-drawer-close" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody className="odh-automl-input-parameters-panel pf-v6-u-pb-lg">
        {isLoading ? (
          <Stack hasGutter>
            {Array.from({ length: 8 }, (_, i) => (
              <StackItem key={i}>
                <Skeleton width="40%" height="14px" className="pf-v6-u-mb-sm" />
                <Skeleton width="70%" height="14px" />
              </StackItem>
            ))}
          </Stack>
        ) : (
          <DescriptionList>
            {entries.map(([key, value], index) => (
              <React.Fragment key={key}>
                {index > 0 && <Divider />}
                <DescriptionListGroup data-testid={`parameter-${key}`}>
                  <DescriptionListTerm>{getParameterLabel(key)}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Content component="p" className="odh-automl-input-parameters-panel__value">
                      {formatValue(key, value)}
                    </Content>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </React.Fragment>
            ))}
          </DescriptionList>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default AutomlInputParametersPanel;
