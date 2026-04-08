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

/** Keys that are handled by the special "Model configuration" entry. */
const MODEL_KEYS = new Set(['generation_models', 'embeddings_models']);

/** Keys excluded from the drawer because they are already shown elsewhere on the page. */
const EXCLUDED_KEYS = new Set(['display_name']);

/**
 * Human-readable labels for known parameter keys.
 * Unknown keys fall back to a formatted version of the key name.
 */
/* eslint-disable camelcase */
const PARAMETER_LABELS: Record<string, string> = {
  description: 'Description',
  input_data_secret_name: 'S3 connection',
  input_data_bucket_name: 'Bucket selection',
  input_data_key: 'Selected files',
  test_data_secret_name: 'Test data connection',
  test_data_bucket_name: 'Test data bucket',
  test_data_key: 'Evaluation dataset',
  llama_stack_secret_name: 'LlamaStack secret',
  llama_stack_vector_io_provider_id: 'Index',
  optimization_metric: 'Optimization metric',
  optimization_max_rag_patterns: 'Maximum RAG patterns',
};

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
        <span style={{ textDecoration: 'underline dotted', cursor: 'default' }}>
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
        <span style={{ textDecoration: 'underline dotted', cursor: 'default' }}>
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
  const entries = parameters
    ? Object.entries(parameters).filter(
        ([key, value]) => !MODEL_KEYS.has(key) && !EXCLUDED_KEYS.has(key) && value !== '',
      )
    : [];

  const generationModels = parameters?.generation_models;
  const embeddingsModels = parameters?.embeddings_models;
  const hasModelConfig = (generationModels?.length ?? 0) > 0 || (embeddingsModels?.length ?? 0) > 0;

  return (
    <DrawerPanelContent minSize="320px" data-testid="run-details-drawer-panel">
      <DrawerHead>
        <Title headingLevel="h2">Run details</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} data-testid="run-details-drawer-close" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody style={{ flex: 1, overflowY: 'auto' }} className="pf-v6-u-pb-lg">
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
                <DescriptionListGroup>
                  <DescriptionListTerm>{getParameterLabel(key)}</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Content
                      component="p"
                      style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                    >
                      {formatValue(key, value)}
                    </Content>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              </React.Fragment>
            ))}
            {hasModelConfig && (
              <>
                {entries.length > 0 && <Divider />}
                <DescriptionListGroup>
                  <DescriptionListTerm>Model configuration</DescriptionListTerm>
                  <DescriptionListDescription>
                    <Content
                      component="p"
                      style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                    >
                      <ModelConfigurationValue
                        generationModels={generationModels}
                        embeddingsModels={embeddingsModels}
                      />
                    </Content>
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
