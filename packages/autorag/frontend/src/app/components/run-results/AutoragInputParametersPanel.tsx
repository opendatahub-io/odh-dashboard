import React from 'react';
import {
  Button,
  ClipboardCopy,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Divider,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Popover,
  Skeleton,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { DashboardPopupIconButton } from 'mod-arch-shared';
import { Link, useParams } from 'react-router';
import InlineTooltip from '~/app/components/InlineTooltip';
import type { ConfigureSchema } from '~/app/schemas/configure.schema';
import type { DetectedLanguageMetadata } from '~/app/types/autoragPattern';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { OPTIMIZATION_METRIC_LABELS, PRESET_LABELS } from '~/app/utilities/const';
import {
  formatDetectedLanguage,
  formatDetectedLanguageMetadata,
} from '~/app/utilities/detectedLanguage';
import {
  getDetectedLanguageFromPatterns,
  isDetectedLanguageMetadata,
} from '~/app/utilities/detectedLanguageFromPatterns';
import { isRunCompleted, isRunInTerminalState } from '~/app/utilities/utils';
import './AutoragInputParametersPanel.scss';

/** Keys that are handled by the special "Model configuration" entry. */
const MODEL_KEYS = new Set(['generation_models', 'embedding_models']);

/** Keys excluded from the drawer because they are already shown elsewhere on the page. */
const EXCLUDED_KEYS = new Set([
  'display_name',
  //   Via UI these keys are hardcoded to match the input data, so we can suppress them
  'test_data_secret_name',
  'test_data_bucket_name',
  // Confidence is combined into the detected languages display value.
  'detected_language_confidence',
]);

/**
 * Ordered parameter definitions with human-readable labels.
 * Controls display order in the drawer panel.
 * Unknown keys appear at the end with a formatted version of the key name.
 */
/* eslint-disable camelcase */
const PANEL_PARAMETERS: { key: string; label: string }[] = [
  { key: 'description', label: 'Description' },
  { key: 'preset', label: 'Run preset' },
  { key: 'ogx_secret_name', label: 'Open GenAI Stack connection' },
  { key: 'input_data_secret_name', label: 'S3 connection' },
  { key: 'input_data_bucket_name', label: 'S3 connection bucket' },
  { key: 'input_data_key', label: 'Selected files and folders' },
  { key: 'vector_io_provider_id', label: 'Vector I/O provider' },
  { key: 'test_data_key', label: 'Evaluation dataset' },
  { key: 'detected_language', label: 'Detected languages' },
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

const DETECTED_LANGUAGES_HELP =
  'Language detection is based on the dominant language of the questions in the evaluation file, not the PDFs.';

const PARAMETER_HELP: Partial<Record<string, string>> = {
  detected_language: DETECTED_LANGUAGES_HELP,
};

const formatValue = (
  key: string,
  value: unknown,
  allParameters?: DisplayParameters,
): React.ReactNode => {
  if (value == null || value === '') {
    return '-';
  }
  if (key === 'preset' && typeof value === 'string') {
    return Object.hasOwn(PRESET_LABELS, value) ? PRESET_LABELS[value] : value;
  }
  if (key === 'detected_language') {
    if (typeof value === 'string') {
      const confidence = allParameters?.detected_language_confidence;
      return formatDetectedLanguage({
        languageCode: value,
        confidence: typeof confidence === 'number' ? confidence : undefined,
      });
    }
    if (isDetectedLanguageMetadata(value)) {
      const confidence = allParameters?.detected_language_confidence;
      return formatDetectedLanguageMetadata(
        value,
        typeof confidence === 'number' ? confidence : undefined,
      );
    }
  }
  if (key === 'optimization_metric' && typeof value === 'string') {
    return Object.hasOwn(OPTIMIZATION_METRIC_LABELS, value)
      ? OPTIMIZATION_METRIC_LABELS[value]
      : value;
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

const ParameterTerm: React.FC<{ parameterKey: string; label: string }> = ({
  parameterKey,
  label,
}) => {
  const helpText = PARAMETER_HELP[parameterKey];
  if (!helpText) {
    return <DescriptionListTerm>{label}</DescriptionListTerm>;
  }

  return (
    <DescriptionListTerm>
      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapXs' }}>
        <FlexItem>{label}</FlexItem>
        <FlexItem>
          <Popover aria-label={`${label} help`} bodyContent={helpText}>
            <DashboardPopupIconButton
              aria-label={`More info for ${label.toLowerCase()}`}
              icon={<OutlinedQuestionCircleIcon />}
              hasNoPadding
              data-testid={`parameter-help-${parameterKey}`}
            />
          </Popover>
        </FlexItem>
      </Flex>
    </DescriptionListTerm>
  );
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
      <InlineTooltip
        key="generation"
        text={`${generationModels.length} foundation model${generationModels.length !== 1 ? 's' : ''}`}
        tooltip={generationModels.join(', ')}
      />,
    );
  }

  if (embeddingsModels.length > 0) {
    if (parts.length > 0) {
      parts.push(', ');
    }
    parts.push(
      <InlineTooltip
        key="embeddings"
        text={`${embeddingsModels.length} embedding model${embeddingsModels.length !== 1 ? 's' : ''}`}
        tooltip={embeddingsModels.join(', ')}
      />,
    );
  }

  if (parts.length === 0) {
    return <>-</>;
  }

  return <>{parts}</>;
};

type DisplayParameters = Omit<Partial<ConfigureSchema>, 'detected_language'> & {
  detected_language?: string | DetectedLanguageMetadata;
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
  const { namespace } = useParams();
  const { pipelineRun, patterns, patternsLoading, ragPatternsBasePath } =
    useAutoragResultsContext();
  const pipelineRef = pipelineRun?.pipeline_version_reference;

  const displayParameters = React.useMemo((): DisplayParameters => {
    const merged: DisplayParameters = { ...parameters };
    if (isEmptyValue(merged.detected_language)) {
      const fromPatterns = getDetectedLanguageFromPatterns(patterns);
      if (fromPatterns) {
        merged.detected_language = fromPatterns;
      }
    }
    return merged;
  }, [parameters, patterns]);

  const entries: [string, unknown][] = React.useMemo(() => {
    const allEntries: [string, unknown][] = Object.entries(displayParameters);
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
  }, [displayParameters]);

  let pipelineServerOutputDirVariant: 'loading' | 'waiting' | 'available' | 'unavailable' =
    'unavailable';
  if (ragPatternsBasePath) {
    pipelineServerOutputDirVariant = 'available';
  } else if (isRunCompleted(pipelineRun?.state) && !ragPatternsBasePath) {
    pipelineServerOutputDirVariant = 'loading';
  } else if (patternsLoading || !pipelineRun?.state || !isRunInTerminalState(pipelineRun.state)) {
    pipelineServerOutputDirVariant = 'waiting';
  }

  const generationModels = Array.isArray(parameters?.generation_models)
    ? parameters.generation_models
    : [];
  const embeddingModels = Array.isArray(parameters?.embedding_models)
    ? parameters.embedding_models
    : [];
  const hasModelConfig = generationModels.length > 0 || embeddingModels.length > 0;

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
          <>
            <DescriptionList>
              {pipelineRun?.run_id && (
                <>
                  <DescriptionListGroup data-testid="parameter-run-id">
                    <DescriptionListTerm>Pipeline run ID</DescriptionListTerm>
                    <DescriptionListDescription>
                      <ClipboardCopy
                        isReadOnly
                        hoverTip="Copy"
                        clickTip="Copied"
                        data-testid="clipboard-run-id"
                      >
                        {pipelineRun.run_id}
                      </ClipboardCopy>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <Divider />
                </>
              )}
              <DescriptionListGroup data-testid="parameter-output-directory">
                <DescriptionListTerm>Pipeline Server output directory</DescriptionListTerm>
                <DescriptionListDescription>
                  {pipelineServerOutputDirVariant === 'loading' && (
                    <Skeleton width="100%" height="var(--pf-t--global--font--size--4xl)" />
                  )}
                  {pipelineServerOutputDirVariant === 'waiting' && (
                    <Content component={ContentVariants.p} aria-live="polite" role="status">
                      <span className="pf-v6-u-pr-sm">
                        The output directory will be available once evaluation is complete.
                      </span>
                      <Spinner
                        isInline
                        size="sm"
                        aria-label="Spinner for the parameter output directory"
                      />
                    </Content>
                  )}
                  {pipelineServerOutputDirVariant === 'available' && ragPatternsBasePath && (
                    <ClipboardCopy
                      isReadOnly
                      hoverTip="Copy"
                      clickTip="Copied"
                      data-testid="clipboard-output-directory"
                    >
                      {ragPatternsBasePath}
                    </ClipboardCopy>
                  )}
                  {pipelineServerOutputDirVariant === 'unavailable' && 'Not available'}
                </DescriptionListDescription>
              </DescriptionListGroup>
            </DescriptionList>
            <Divider className="pf-v6-u-mt-lg" />
            <Title headingLevel="h3" size="xl" className="pf-v6-u-mt-lg pf-v6-u-mb-md">
              Input parameters
            </Title>
            <DescriptionList>
              {entries.map(([key, value]) => (
                <DescriptionListGroup key={key} data-testid={`parameter-${key}`}>
                  <ParameterTerm parameterKey={key} label={getParameterLabel(key)} />
                  <DescriptionListDescription>
                    <Content component="p" className="odh-autorag-input-parameters-panel__value">
                      {formatValue(key, value, displayParameters)}
                    </Content>
                  </DescriptionListDescription>
                </DescriptionListGroup>
              ))}
              {hasModelConfig && (
                <DescriptionListGroup data-testid="parameter-model-configuration">
                  <DescriptionListTerm>Model configuration</DescriptionListTerm>
                  <DescriptionListDescription className="odh-autorag-input-parameters-panel__value">
                    <ModelConfigurationValue
                      generationModels={generationModels}
                      embeddingsModels={embeddingModels}
                    />
                  </DescriptionListDescription>
                </DescriptionListGroup>
              )}
            </DescriptionList>
            {(pipelineRef || pipelineRun?.run_id) && (
              <div>
                <Divider className="pf-v6-u-mt-lg pf-v6-u-mb-lg" />
                <Stack hasGutter>
                  {pipelineRef && (
                    <StackItem>
                      <Button
                        variant="link"
                        isInline
                        data-testid="parameter-pipeline-definition"
                        component={(props) => (
                          <Link
                            {...props}
                            to={`/develop-train/pipelines/definitions/${namespace}/${pipelineRef.pipeline_id}/${pipelineRef.pipeline_version_id}/view`}
                          />
                        )}
                      >
                        View pipeline definition
                      </Button>
                    </StackItem>
                  )}
                  {/* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition */}
                  {pipelineRun?.run_id && (
                    <StackItem>
                      <Button
                        variant="link"
                        isInline
                        data-testid="parameter-pipeline-run"
                        component={(props) => (
                          <Link
                            {...props}
                            to={`/develop-train/pipelines/runs/${namespace}/runs/${pipelineRun.run_id}`}
                          />
                        )}
                      >
                        View pipeline run
                      </Button>
                    </StackItem>
                  )}
                </Stack>
              </div>
            )}
          </>
        )}
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default AutoragInputParametersPanel;
