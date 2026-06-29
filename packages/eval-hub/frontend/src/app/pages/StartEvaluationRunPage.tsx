import * as React from 'react';
import {
  ActionGroup,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Checkbox,
  Content,
  Divider,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  MenuToggle,
  PageSection,
  Radio,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextInput,
  Tooltip,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  MlflowExperimentSelector,
  useMlflowExperiments,
} from '@odh-dashboard/internal/concepts/mlflow';
import {
  evaluationsBaseRoute,
  evaluationBenchmarksRoute,
  evaluationCollectionsRoute,
  evaluationCreateRoute,
} from '~/app/routes';
import { useEvaluationSelection } from '~/app/hooks/useEvaluationSelection';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import PrimaryScorerMetricField from '~/app/components/PrimaryScorerMetricField';
import SourceModelFields from '~/app/components/SourceModelFields';
import SourceAgentFields from '~/app/components/SourceAgentFields';
import SourcePrerecordedFields from '~/app/components/SourcePrerecordedFields';
import type { SourceMode } from '~/app/types';
import {
  useStartEvaluationRunForm,
  EXPERIMENT_FILTER,
  DEFAULT_EXPERIMENT_NAME,
  EXTERNAL_ENDPOINT_VALUE,
} from './useStartEvaluationRunForm';

import './StartEvaluationRunPage.css';

const SOURCE_OPTIONS: { value: SourceMode; label: string }[] = [
  { value: 'model', label: 'Model' },
  { value: 'agent', label: 'Agent' },
  { value: 'prerecorded', label: 'Pre-recorded responses' },
];

const StartEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  const { benchmark, collection, isCollectionFlow, dataLoaded, loadError } =
    useEvaluationSelection(namespace);

  const { data: experiments, loaded: experimentsLoaded } = useMlflowExperiments({
    workspace: namespace ?? '',
    filter: EXPERIMENT_FILTER,
  });

  const {
    inferenceServices,
    loaded: isLoaded,
    loadError: isLoadError,
    warning: isWarning,
  } = useInferenceServices(namespace ?? '');

  const form = useStartEvaluationRunForm({
    namespace,
    benchmark,
    collection,
    isCollectionFlow,
    experiments,
    experimentsLoaded,
  });

  const breadcrumbFlowLabel = isCollectionFlow ? 'Select benchmark suite' : 'Select benchmark';

  // ── Source dropdown state ────────────────────────────────────────────

  const [isSourceOpen, setIsSourceOpen] = React.useState(false);
  const [isModelOpen, setIsModelOpen] = React.useState(false);

  const handleSourceSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value === 'string') {
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        form.handleSourceModeChange(value as SourceMode);
      }
      setIsSourceOpen(false);
    },
    [form],
  );

  const handleModelSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value === 'string') {
        form.handleModelDropdownSelect(value, inferenceServices);
      }
      setIsModelOpen(false);
    },
    [form, inferenceServices],
  );

  const modelDropdownDisplayValue = React.useMemo(() => {
    if (form.modelSelection === 'external') {
      return 'Other (External endpoint)';
    }
    return form.selectedInferenceService?.name ?? 'Choose model';
  }, [form.modelSelection, form.selectedInferenceService]);

  // ── Loading & error states ──────────────────────────────────────────

  if (!dataLoaded) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading evaluation data" />
      </Bullseye>
    );
  }

  if (loadError) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to load evaluation data"
          status="danger"
          data-testid="start-evaluation-load-error"
        >
          <EmptyStateBody>{loadError.message}</EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                component={(props) => <Link {...props} to={evaluationsBaseRoute(namespace)} />}
              >
                Return to evaluations
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  const showExternalModelFields = form.sourceMode === 'model' && form.modelSelection === 'external';

  return (
    <ApplicationsPage
      noHeader
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
          />
          <BreadcrumbItem
            render={() => <Link to={evaluationCreateRoute(namespace)}>Select evaluation type</Link>}
          />
          <BreadcrumbItem
            render={() => (
              <Link
                to={
                  isCollectionFlow
                    ? evaluationCollectionsRoute(namespace)
                    : evaluationBenchmarksRoute(namespace)
                }
              >
                {breadcrumbFlowLabel}
              </Link>
            )}
          />
          <BreadcrumbItem isActive>Start evaluation run</BreadcrumbItem>
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <Content
          component="h1"
          data-testid="app-page-title"
          style={{ marginBlockStart: 0, marginBlockEnd: 0 }}
        >
          Start evaluation run
        </Content>
        <Form style={{ maxWidth: 700 }} data-testid="start-evaluation-form">
          {/* ── Evaluation name ─────────────────────────────────── */}
          <FormGroup label="Evaluation name" isRequired fieldId="evaluation-name">
            <TextInput
              id="evaluation-name"
              data-testid="evaluation-name-input"
              value={form.evaluationName}
              onChange={(_e, val) => form.setEvaluationName(val)}
              isRequired
            />
          </FormGroup>

          {/* ── MLflow Experiment ───────────────────────────────── */}
          <FormGroup
            label="MLflow Experiment"
            isRequired
            fieldId="mlflow-experiment"
            labelHelp={
              <LabelHelpPopover
                ariaLabel="More info for MLflow experiment"
                content="Select an existing MLflow experiment that this evaluation will belong to, or create a new experiment."
              />
            }
          >
            <Radio
              id="experiment-existing"
              data-testid="experiment-mode-existing"
              name="experiment-mode"
              label="Select existing experiment"
              isChecked={form.experimentMode === 'existing'}
              onChange={() => {
                form.setExperimentMode('existing');
                form.setNewExperimentName('');
                form.experimentManuallyChangedRef.current = true;
              }}
            />

            {form.experimentMode === 'existing' && namespace && (
              <div
                className="eval-hub-start-evaluation-run__mlflow-selector"
                style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}
              >
                <MlflowExperimentSelector
                  workspace={namespace}
                  filter={EXPERIMENT_FILTER}
                  selection={form.selectedExperiment?.name}
                  onSelect={(exp) => {
                    form.setSelectedExperiment(exp);
                    form.experimentManuallyChangedRef.current = true;
                  }}
                />
              </div>
            )}

            <div style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
              <Radio
                id="experiment-new"
                data-testid="experiment-mode-new"
                name="experiment-mode"
                label="Create new experiment"
                isChecked={form.experimentMode === 'new'}
                onChange={() => {
                  form.setExperimentMode('new');
                  form.setSelectedExperiment(undefined);
                  form.experimentManuallyChangedRef.current = true;
                  form.setNewExperimentName((prev) =>
                    prev.trim() === '' ? DEFAULT_EXPERIMENT_NAME : prev,
                  );
                }}
              />
            </div>

            {form.experimentMode === 'new' && (
              <div style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
                <TextInput
                  id="new-experiment-name"
                  data-testid="new-experiment-name-input"
                  value={form.newExperimentName}
                  onChange={(_e, val) => form.setNewExperimentName(val)}
                  placeholder="Enter experiment name"
                />
              </div>
            )}
          </FormGroup>

          {/* ── Source dropdown ─────────────────────────────────── */}
          <FormGroup label="Source" isRequired fieldId="source-mode">
            <Select
              id="source-mode"
              data-testid="source-mode-select"
              isOpen={isSourceOpen}
              selected={form.sourceMode}
              onSelect={handleSourceSelect}
              onOpenChange={setIsSourceOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  onClick={() => setIsSourceOpen((prev) => !prev)}
                  isExpanded={isSourceOpen}
                  isFullWidth
                  data-testid="source-mode-toggle"
                >
                  {SOURCE_OPTIONS.find((o) => o.value === form.sourceMode)?.label}
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <SelectList>
                {SOURCE_OPTIONS.map((opt) => (
                  <SelectOption
                    key={opt.value}
                    value={opt.value}
                    isSelected={opt.value === form.sourceMode}
                  >
                    {opt.label}
                  </SelectOption>
                ))}
              </SelectList>
            </Select>
          </FormGroup>

          {/* ── Model mode: model picker ───────────────────────── */}
          {form.sourceMode === 'model' && (
            <FormGroup
              label="Model"
              isRequired
              fieldId="model-picker"
              labelHelp={
                <LabelHelpPopover
                  ariaLabel="More info for model selection"
                  content="Select a deployed model from your namespace, or choose 'Other (External endpoint)' to enter an external model URL."
                />
              }
            >
              <Select
                id="model-picker"
                data-testid="model-picker-select"
                isOpen={isModelOpen}
                selected={
                  form.modelSelection === 'external'
                    ? EXTERNAL_ENDPOINT_VALUE
                    : form.selectedInferenceService?.name
                }
                onSelect={handleModelSelect}
                onOpenChange={setIsModelOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsModelOpen((prev) => !prev)}
                    isExpanded={isModelOpen}
                    isFullWidth
                    data-testid="model-picker-toggle"
                  >
                    {modelDropdownDisplayValue}
                  </MenuToggle>
                )}
                shouldFocusToggleOnSelect
              >
                <SelectList>
                  {isLoaded && inferenceServices.length > 0 ? (
                    <>
                      {inferenceServices.map((is) => (
                        <SelectOption
                          key={is.name}
                          value={is.name}
                          data-testid={`model-option-${is.name}`}
                          isDisabled={!is.ready}
                          isSelected={
                            form.modelSelection === 'cluster' &&
                            form.selectedInferenceService?.name === is.name
                          }
                        >
                          {is.name}
                          {!is.ready && (
                            <Tooltip content="This model is unavailable. Check the model's deployment status.">
                              <Icon
                                status="danger"
                                iconSize="sm"
                                style={{ marginLeft: 'var(--pf-t--global--spacer--sm)' }}
                              >
                                <ExclamationCircleIcon />
                              </Icon>
                            </Tooltip>
                          )}
                        </SelectOption>
                      ))}
                      <Divider />
                    </>
                  ) : null}
                  <SelectOption
                    key={EXTERNAL_ENDPOINT_VALUE}
                    value={EXTERNAL_ENDPOINT_VALUE}
                    data-testid="model-option-external"
                    isSelected={form.modelSelection === 'external'}
                  >
                    Other (External endpoint)
                  </SelectOption>
                </SelectList>
              </Select>
              {isLoadError ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="warning">
                      Could not load cluster models. You can still use an external endpoint.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
              {!isLoadError && isWarning ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem variant="warning">{isWarning}</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          )}

          {/* ── Model (external) fields ────────────────────────── */}
          {showExternalModelFields && (
            <SourceModelFields
              modelName={form.modelName}
              onModelNameChange={form.setModelName}
              endpointUrl={form.endpointUrl}
              onEndpointUrlChange={form.setEndpointUrl}
              apiKeySecretRef={form.apiKeySecretRef}
              onApiKeyChange={form.setApiKeySecretRef}
              endpointUrlError={form.endpointUrlError}
              touched={form.touched}
              markTouched={form.markTouched}
              connectionValidation={form.connectionValidation}
              canVerifyConnection={form.canVerifyConnection}
              onVerifyConnection={form.handleVerifyConnection}
            />
          )}

          {/* ── Agent mode fields ──────────────────────────────── */}
          {form.sourceMode === 'agent' && (
            <SourceAgentFields
              agentName={form.agentName}
              onAgentNameChange={form.setAgentName}
              endpointUrl={form.endpointUrl}
              onEndpointUrlChange={form.setEndpointUrl}
              apiKeySecretRef={form.apiKeySecretRef}
              onApiKeyChange={form.setApiKeySecretRef}
              endpointUrlError={form.endpointUrlError}
              touched={form.touched}
              markTouched={form.markTouched}
              connectionValidation={form.connectionValidation}
              canVerifyConnection={form.canVerifyConnection}
              onVerifyConnection={form.handleVerifyConnection}
            />
          )}

          {/* ── Pre-recorded responses fields ──────────────────── */}
          {form.sourceMode === 'prerecorded' && (
            <SourcePrerecordedFields
              sourceName={form.sourceName}
              onSourceNameChange={form.setSourceName}
              datasetUrl={form.datasetUrl}
              onDatasetUrlChange={form.setDatasetUrl}
              accessToken={form.accessToken}
              onAccessTokenChange={form.setAccessToken}
              datasetUrlError={form.datasetUrlError}
              touched={form.touched}
              markTouched={form.markTouched}
              connectionValidation={form.connectionValidation}
              canVerifyConnection={form.canVerifyConnection}
              onVerifyConnection={form.handleVerifyConnection}
            />
          )}

          {/* ── Benchmark display ──────────────────────────────── */}
          <FormGroup
            label={isCollectionFlow ? 'Benchmark suite' : 'Benchmark'}
            fieldId="benchmark-name"
          >
            <Content component="p" data-testid="benchmark-name-display">
              {form.benchmarkDisplayName}
            </Content>
          </FormGroup>

          {/* ── Threshold ──────────────────────────────────────── */}
          <BenchmarkThresholdField
            value={form.threshold}
            onChange={form.handleThresholdChange}
            label={isCollectionFlow ? 'Benchmark suite threshold' : 'Benchmark threshold'}
            fieldId="benchmark-threshold"
          />

          {/* ── Primary scorer metric ──────────────────────────── */}
          {!isCollectionFlow && form.availableMetrics.length > 0 ? (
            <PrimaryScorerMetricField
              metrics={form.availableMetrics}
              selected={form.primaryMetric}
              onChange={form.handlePrimaryMetricChange}
            />
          ) : null}

          {/* ── Benchmark parameters ───────────────────────────── */}
          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Checkbox
                id="show-additional-args"
                data-testid="show-additional-args"
                label="Benchmark parameters"
                isChecked={form.showAdditionalArgs}
                onChange={(_e, checked) => form.setShowAdditionalArgs(checked)}
              />
            </FlexItem>
            <FlexItem>
              <LabelHelpPopover
                ariaLabel="More info for benchmark parameters"
                content="Enter the benchmark parameters for this evaluation run, or upload a JSON file containing them."
              />
            </FlexItem>
          </Flex>
          {form.showAdditionalArgs ? (
            <FormGroup fieldId="additional-args">
              <FileUpload
                id="additional-args"
                data-testid="additional-args-upload"
                type="text"
                value={form.additionalArgs}
                filename={form.additionalArgsFilename}
                filenamePlaceholder="Drag and drop a file or upload"
                onFileInputChange={form.handleAdditionalArgsFileChange}
                onTextChange={form.handleAdditionalArgsTextChange}
                onClearClick={form.handleAdditionalArgsClear}
                browseButtonText="Upload"
                allowEditingUploadedText
                textAreaPlaceholder={'{\n  "num_examples": 10\n}'}
                dropzoneProps={{
                  accept: { 'application/json': ['.json'] },
                }}
              />
              <FormHelperText>
                <HelperText>
                  <HelperTextItem>Upload a JSON file</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </FormGroup>
          ) : null}

          {/* ── Actions ────────────────────────────────────────── */}
          <ActionGroup>
            <Button
              variant="primary"
              data-testid="start-evaluation-submit"
              onClick={form.handleSubmit}
              isDisabled={!form.isValid || form.isSubmitting}
              isLoading={form.isSubmitting}
            >
              Start evaluation run
            </Button>
            <Button
              variant="link"
              data-testid="start-evaluation-cancel"
              onClick={form.handleCancel}
            >
              Cancel
            </Button>
          </ActionGroup>
        </Form>
      </PageSection>
    </ApplicationsPage>
  );
};

export default StartEvaluationRunPage;
