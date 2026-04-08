import React from 'react';
import {
  Drawer,
  DrawerActions,
  DrawerCloseButton,
  DrawerContent,
  DrawerContentBody,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Title,
  Tooltip,
} from '@patternfly/react-core';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import { OPTIMIZATION_METRIC_LABELS } from '~/app/utilities/const';

/** Keys that are handled by the special "Model configuration" entry. */
const MODEL_KEYS = new Set(['generation_models', 'embeddings_models']);

/**
 * Converts a snake_case key into a human-readable label.
 * e.g. "input_data_secret_name" → "Input data secret name"
 */
const formatKeyAsLabel = (key: string): string => {
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

type AutoragInputParametersDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  parameters?: Partial<ConfigureSchema>;
  children: React.ReactNode;
};

const AutoragInputParametersDrawer: React.FC<AutoragInputParametersDrawerProps> = ({
  isOpen,
  onClose,
  parameters,
  children,
}) => {
  const panelContent = (
    <DrawerPanelContent isResizable minSize="320px" data-testid="run-details-drawer-panel">
      <DrawerHead>
        <Title headingLevel="h2">Run details</Title>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} data-testid="run-details-drawer-close" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody>
        <DescriptionList>
          {parameters &&
            Object.entries(parameters)
              .filter(([key]) => !MODEL_KEYS.has(key))
              .map(([key, value]) => (
                <DescriptionListGroup key={key}>
                  <DescriptionListTerm>{formatKeyAsLabel(key)}</DescriptionListTerm>
                  <DescriptionListDescription>{formatValue(key, value)}</DescriptionListDescription>
                </DescriptionListGroup>
              ))}
          {parameters &&
            (parameters.generation_models?.length || parameters.embeddings_models?.length) && (
              <DescriptionListGroup>
                <DescriptionListTerm>Model configuration</DescriptionListTerm>
                <DescriptionListDescription>
                  <ModelConfigurationValue
                    generationModels={parameters.generation_models}
                    embeddingsModels={parameters.embeddings_models}
                  />
                </DescriptionListDescription>
              </DescriptionListGroup>
            )}
        </DescriptionList>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isOpen} onExpand={() => undefined}>
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default AutoragInputParametersDrawer;
