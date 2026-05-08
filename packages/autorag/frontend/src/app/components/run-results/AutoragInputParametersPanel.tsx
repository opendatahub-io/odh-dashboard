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
  Tooltip,
} from '@patternfly/react-core';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { OPTIMIZATION_METRIC_LABELS } from '~/app/utilities/const';
import './AutoragInputParametersPanel.scss';

/** Keys that are handled by the special "Model configuration" entry. */
const MODEL_KEYS = new Set(['generation_models', 'embeddings_models']);

/** Keys excluded from the drawer because they are already shown elsewhere on the page. */
const EXCLUDED_KEYS = new Set([
  'display_name',
  //   Via UI these keys are hardcoded to match the input data, so we can suppress them
  'test_data_secret_name',
  'test_data_bucket_name',
]);

/**
 * Ordered parameter definitions with human-readable labels.
 * Controls display order in the drawer panel.
 * Unknown keys appear at the end with a formatted version of the key name.
 */
/* eslint-disable camelcase */
const PANEL_PARAMETERS: { key: string; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'llama_stack_secret_name', label: 'Llama Stack connection' },
  { key: 'input_data_secret_name', label: 'S3 connection' },
  { key: 'input_data_bucket_name', label: 'S3 connection bucket' },
  { key: 'input_data_key', label: 'Selected files and folders' },
  { key: 'llama_stack_vector_io_provider_id', label: 'Vector I/O provider' },
  { key: 'test_data_key', label: 'Evaluation dataset' },
  { key: 'optimization_metric', label: 'Optimization metric' },
  { key: 'optimization_max_rag_patterns', label: 'Maximum RAG patterns' },
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
  if (key === 'optimization_metric' && typeof value === 'string') {
    return OPTIMIZATION_METRIC_LABELS[value] ?? value;
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

type ModelConfigurationValueProps = {
  generationModels?: string[];
  embeddingsModels?: string[];
};

const ModelConfigurationValue: React.FC<ModelConfigurationValueProps> = ({
  generationModels = [],
  embeddingsModels = [],
}) => {
  const parts: React.ReactNode[] = [];

  if (generationModels.length > 0) {
    parts.push(
      <Tooltip key="generation" content={generationModels.join(', ')}>
        <span
          className="odh-autorag-input-parameters-panel__tooltip-text"
          tabIndex={0}
          role="button"
        >
          {generationModels.length} foundation model{generationModels.length !== 1 ? 's' : ''}
        </span>
      </Tooltip>,
    );
  }

  if (embeddingsModels.length > 0) {
    if (parts.length > 0) {
      parts.push(', ');
    }
    parts.push(
      <Tooltip key="embeddings" content={embeddingsModels.join(', ')}>
        <span
          className="odh-autorag-input-parameters-panel__tooltip-text"
          tabIndex={0}
          role="button"
        >
          {embeddingsModels.length} embedding model{embeddingsModels.length !== 1 ? 's' : ''}
        </span>
      </Tooltip>,
    );
  }

  if (parts.length === 0) {
    return <>-</>;
  }

  return <>{parts}</>;
};

type AutoragInputParametersPanelProps = {
  onClose: () => void;
  parameters?: Partial<ConfigureSchema>;
  isLoading?: boolean;
};

const AutoragInputParametersPanel: React.FC<AutoragInputParametersPanelProps> = ({
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
    const knownKeySet = new Set([...ORDERED_KEYS, ...MODEL_KEYS, ...EXCLUDED_KEYS]);

    // Build entries in the display order defined by PANEL_PARAMETERS, skipping empty values
    const knownEntries: [string, unknown][] = ORDERED_KEYS.filter(
      (key) => valueByKey.has(key) && !isEmptyValue(valueByKey.get(key)),
    ).map((key) => [key, valueByKey.get(key)]);

    // Append any unexpected keys (e.g. new API fields) at the end
    const unknownEntries = allEntries.filter(
      ([key, value]) => !knownKeySet.has(key) && !isEmptyValue(value),
    );
    return [...knownEntries, ...unknownEntries];
  }, [parameters]);

  const generationModels = parameters?.generation_models;
  const embeddingsModels = parameters?.embeddings_models;
  const hasModelConfig = (generationModels?.length ?? 0) > 0 || (embeddingsModels?.length ?? 0) > 0;

  return (
    <DrawerPanelContent minSize="320px" data-testid="run-details-drawer-panel">
      <DrawerHead className="odh-autorag-input-parameters-panel__head">
        <Title headingLevel="h2">Run details</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} data-testid="run-details-drawer-close" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody className="odh-autorag-input-parameters-panel pf-v6-u-pb-lg">
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
                    <Content component="p" className="odh-autorag-input-parameters-panel__value">
                      {formatValue(key, value)}
                    </Content>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </React.Fragment>
            ))}
            {hasModelConfig && (
              <>
                {entries.length > 0 && <Divider />}
                <DescriptionListGroup data-testid="parameter-model-configuration">
                  <DescriptionListTerm>Model configuration</DescriptionListTerm>
                  <DescriptionListDescription className="odh-autorag-input-parameters-panel__value">
                    <ModelConfigurationValue
                      generationModels={generationModels}
                      embeddingsModels={embeddingsModels}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </>
            )}
          </DescriptionList>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default AutoragInputParametersPanel;
