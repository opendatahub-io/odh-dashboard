import * as React from 'react';
import { Controller, FormProvider } from 'react-hook-form';
import {
  Button,
  Checkbox,
  Content,
  Divider,
  ExpandableSection,
  FileUpload,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  MenuToggle,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Radio,
  Select,
  SelectList,
  SelectOption,
  TextInput,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import {
  MlflowExperimentSelector,
  useMlflowExperiments,
} from '@odh-dashboard/internal/concepts/mlflow';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import FormGroupLabel from '~/app/components/FormGroupLabel';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import SourceAgentFields from '~/app/components/SourceAgentFields';
import SourceModelFields from '~/app/components/SourceModelFields';
import SourcePrerecordedFields from '~/app/components/SourcePrerecordedFields';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import {
  DEFAULT_EXPERIMENT_NAME,
  EXTERNAL_ENDPOINT_VALUE,
  useStartEvaluationRunForm,
} from '~/app/pages/useStartEvaluationRunForm';
import { isSuiteEvaluatesOption } from '~/app/pages/const';
import {
  SOURCE_OPTIONS,
  suiteEvaluatesToSourceMode,
} from '~/app/utilities/startEvaluationRunUtils';
import type { Collection, FlatBenchmark, SourceMode } from '~/app/types';
import { getIncompatibleModelReason } from '~/app/utils/modelCompatibility';
import './StartEvaluationRunModal.scss';

type StartEvaluationRunModalProps = {
  isOpen: boolean;
  onClose: () => void;
  namespace: string | undefined;
  collection?: Collection;
  benchmark?: FlatBenchmark;
  isCollectionFlow: boolean;
  defaultEvaluationName?: string;
  defaultSourceMode?: SourceMode;
  modalId?: string;
  resolveCollection?: (signal?: AbortSignal) => Promise<Collection | undefined>;
  onClonePendingChange?: (isPending: boolean) => void;
  trackingSource?: string;
  onSuccess?: () => void;
};

const StartEvaluationRunModal: React.FC<StartEvaluationRunModalProps> = ({
  isOpen,
  onClose,
  namespace,
  collection,
  benchmark,
  isCollectionFlow,
  defaultEvaluationName,
  defaultSourceMode,
  modalId = 'start-evaluation-run-modal',
  resolveCollection,
  onClonePendingChange,
  trackingSource,
  onSuccess,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const [isCloning, setIsCloning] = React.useState(false);
  const [isModelOpen, setIsModelOpen] = React.useState(false);
  const startAttemptRef = React.useRef(0);
  const isStartInFlightRef = React.useRef(false);
  const cloneAbortControllerRef = React.useRef<AbortController | null>(null);
  const clonePendingChangeRef = React.useRef(onClonePendingChange);

  const { data: experiments, loaded: experimentsLoaded } = useMlflowExperiments({
    workspace: namespace ?? '',
  });

  const aiEntitySourceMode = React.useMemo(() => {
    const aiEntities = collection?.ai_entities;
    if (aiEntities?.length !== 1) {
      return undefined;
    }

    const aiEntity = aiEntities[0];
    return isSuiteEvaluatesOption(aiEntity) ? suiteEvaluatesToSourceMode(aiEntity) : undefined;
  }, [collection]);
  const hasSingleAiEntity = aiEntitySourceMode !== undefined;

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
    defaultEvaluationName,
    defaultSourceMode: aiEntitySourceMode ?? defaultSourceMode,
    trackingSource,
    onSuccess,
    onCancel: onClose,
  });

  const isSubmitting = form.isSubmitting || isCloning;

  const [isSourceOpen, setIsSourceOpen] = React.useState(false);
  React.useEffect(() => {
    if (isCloning) {
      setIsModelOpen(false);
    }
  }, [isCloning]);

  React.useEffect(() => {
    clonePendingChangeRef.current = onClonePendingChange;
  }, [onClonePendingChange]);

  React.useEffect(
    () => () => {
      // Invalidate and abort any deferred clone when the modal is removed.
      startAttemptRef.current += 1;
      cloneAbortControllerRef.current?.abort();
      clonePendingChangeRef.current?.(false);
    },
    [],
  );

  const handleClose = React.useCallback(() => {
    // A clone may resolve after the user has closed the modal. Invalidate its attempt before
    // notifying the parent so its continuation cannot submit an evaluation run.
    startAttemptRef.current += 1;
    cloneAbortControllerRef.current?.abort();
    cloneAbortControllerRef.current = null;
    isStartInFlightRef.current = false;
    setIsCloning(false);
    onClonePendingChange?.(false);
    form.handleCancel();
  }, [form, onClonePendingChange]);

  const handleModelSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      if (typeof value === 'string') {
        form.handleModelDropdownSelect(value, inferenceServices);
      }
      setIsModelOpen(false);
    },
    [form, inferenceServices],
  );

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

  const modelDropdownDisplayValue = React.useMemo(() => {
    if (form.modelSelection === 'external') {
      return 'Other (External endpoint)';
    }
    return form.selectedInferenceService?.name ?? 'Choose model';
  }, [form.modelSelection, form.selectedInferenceService]);

  const showExternalModelFields = form.sourceMode === 'model' && form.modelSelection === 'external';

  const handleStart = React.useCallback(async () => {
    if (!form.isValid || isStartInFlightRef.current) {
      return;
    }

    isStartInFlightRef.current = true;
    const startAttempt = ++startAttemptRef.current;

    try {
      let activeCollection = collection;
      if (resolveCollection) {
        const cloneAbortController = new AbortController();
        cloneAbortControllerRef.current = cloneAbortController;
        setIsCloning(true);
        onClonePendingChange?.(true);
        try {
          const cloned = await resolveCollection(cloneAbortController.signal);
          if (
            startAttempt !== startAttemptRef.current ||
            cloneAbortController.signal.aborted ||
            !cloned
          ) {
            return;
          }
          activeCollection = cloned;
        } finally {
          if (cloneAbortControllerRef.current === cloneAbortController) {
            cloneAbortControllerRef.current = null;
          }
          if (startAttempt === startAttemptRef.current) {
            setIsCloning(false);
            onClonePendingChange?.(false);
          }
        }
      }

      if (startAttempt !== startAttemptRef.current) {
        return;
      }

      // Revalidate after cloning so only a currently valid request is submitted.
      if (!(await form.form.trigger()) || startAttempt !== startAttemptRef.current) {
        return;
      }

      await form.handleSubmit({ collection: activeCollection });
    } catch {
      // Collection resolvers own request-error feedback. A rejected resolver must not submit.
    } finally {
      if (startAttempt === startAttemptRef.current) {
        isStartInFlightRef.current = false;
      }
    }
  }, [collection, form, onClonePendingChange, resolveCollection]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      id={modalId}
      data-testid={modalId}
      className="evalhub-start-evaluation-run-modal"
    >
      <ModalHeader title="Start evaluation run" />
      <ModalBody>
        {collection ? (
          <Content
            component="p"
            className="evalhub-start-evaluation-run-modal__suite-name"
            data-testid="start-evaluation-run-collection-name"
          >
            Benchmark suite: {collection.name}
          </Content>
        ) : null}
        <FormProvider {...form.form}>
          <Form data-testid="start-evaluation-form" aria-busy={isCloning}>
            <fieldset disabled={isCloning} className="evalhub-start-evaluation-run-modal__fields">
              <FormGroup label="Evaluation name" isRequired fieldId="evaluation-name">
                <Controller
                  name="evaluationName"
                  control={form.form.control}
                  render={({ field }) => (
                    <TextInput
                      id="evaluation-name"
                      data-testid="evaluation-name-input"
                      value={field.value}
                      onChange={(_e, val) => field.onChange(val)}
                      onBlur={field.onBlur}
                      isRequired
                    />
                  )}
                />
              </FormGroup>

              {!hasSingleAiEntity ? (
                <FormGroup
                  className="evalhub-form-group--with-description"
                  label={
                    <FormGroupLabel
                      label="Evaluating"
                      description="Select the model, agent, or dataset to evaluate."
                      isRequired
                    />
                  }
                  fieldId="source-mode"
                >
                  <Select
                    id="source-mode-menu"
                    data-testid="source-mode-select"
                    isOpen={isSourceOpen}
                    selected={form.sourceMode}
                    onSelect={handleSourceSelect}
                    onOpenChange={setIsSourceOpen}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        id="source-mode"
                        ref={toggleRef}
                        onClick={() => setIsSourceOpen((prev) => !prev)}
                        isExpanded={isSourceOpen}
                        isFullWidth
                        data-testid="source-mode-toggle"
                      >
                        {SOURCE_OPTIONS.find((option) => option.value === form.sourceMode)?.label}
                      </MenuToggle>
                    )}
                    shouldFocusToggleOnSelect
                  >
                    <SelectList>
                      {SOURCE_OPTIONS.map((option) => (
                        <SelectOption
                          key={option.value}
                          value={option.value}
                          isSelected={option.value === form.sourceMode}
                        >
                          {option.label}
                        </SelectOption>
                      ))}
                    </SelectList>
                  </Select>
                </FormGroup>
              ) : null}

              {form.sourceMode === 'model' ? (
                <FormGroup
                  className="evalhub-form-group--with-description"
                  label={
                    <FormGroupLabel
                      label="Model"
                      description="Select a model from your project's AI asset endpoints, or specify an external endpoint."
                      isRequired
                      helpPopover={{
                        ariaLabel: 'More info for model selection',
                        content:
                          'The list contains models that have been published as AI asset endpoints in this project.',
                      }}
                    />
                  }
                  fieldId="model-picker"
                >
                  <Select
                    key={isCloning ? 'cloning' : 'ready'}
                    id="model-picker-menu"
                    data-testid="model-picker-select"
                    isOpen={isModelOpen && !isCloning}
                    selected={
                      form.modelSelection === 'external'
                        ? EXTERNAL_ENDPOINT_VALUE
                        : form.selectedInferenceService?.name
                    }
                    onSelect={handleModelSelect}
                    onOpenChange={setIsModelOpen}
                    toggle={(toggleRef) => (
                      <MenuToggle
                        id="model-picker"
                        ref={toggleRef}
                        onClick={() => setIsModelOpen((prev) => !prev)}
                        isExpanded={isModelOpen}
                        isDisabled={isCloning}
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
                          {inferenceServices.map((is) => {
                            const incompatibleReason = getIncompatibleModelReason(is);
                            const isDisabled = !!incompatibleReason;

                            return (
                              <SelectOption
                                key={is.name}
                                value={is.name}
                                data-testid={`model-option-${is.name}`}
                                isDisabled={isDisabled}
                                isSelected={
                                  form.modelSelection === 'cluster' &&
                                  form.selectedInferenceService?.name === is.name
                                }
                                description={incompatibleReason}
                              >
                                {is.name}
                                {isDisabled ? (
                                  <Icon status="danger" iconSize="sm" className="pf-v6-u-ml-sm">
                                    <ExclamationCircleIcon />
                                  </Icon>
                                ) : null}
                              </SelectOption>
                            );
                          })}
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
              ) : null}

              {showExternalModelFields ? (
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
              ) : null}

              {form.sourceMode === 'agent' ? (
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
              ) : null}

              {form.sourceMode === 'prerecorded' ? (
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
                />
              ) : null}

              <ExpandableSection
                className="evalhub-start-evaluation-run-modal__advanced"
                toggleText={
                  isAdvancedOpen ? 'Hide advanced configuration' : 'Advanced configuration'
                }
                isExpanded={isAdvancedOpen}
                onToggle={(_event, expanded) => setIsAdvancedOpen(expanded)}
                data-testid="start-evaluation-run-advanced-toggle"
              >
                <FormGroup label="MLflow Experiment" isRequired fieldId="mlflow-experiment">
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

                  {form.experimentMode === 'existing' && namespace ? (
                    <div className="evalhub-start-evaluation-run-modal__mlflow-selector">
                      <MlflowExperimentSelector
                        key={isCloning ? 'cloning' : 'ready'}
                        workspace={namespace}
                        selection={form.selectedExperiment?.name}
                        isDisabled={isCloning}
                        onSelect={(exp) => {
                          form.setSelectedExperiment(exp);
                          form.experimentManuallyChangedRef.current = true;
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="evalhub-start-evaluation-run-modal__new-experiment-option">
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

                  {form.experimentMode === 'new' ? (
                    <div className="evalhub-start-evaluation-run-modal__new-experiment-name">
                      <TextInput
                        id="new-experiment-name"
                        data-testid="new-experiment-name-input"
                        value={form.newExperimentName}
                        onChange={(_e, val) => form.setNewExperimentName(val)}
                        placeholder="Enter experiment name"
                      />
                    </div>
                  ) : null}
                </FormGroup>

                {!isCollectionFlow ? (
                  <BenchmarkThresholdField
                    value={form.threshold}
                    onChange={form.handleThresholdChange}
                    label="Benchmark threshold"
                    fieldId="benchmark-threshold"
                    isDisabled={isCloning}
                  />
                ) : null}

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
                      isDisabled={isCloning}
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
                        disabled: isCloning,
                      }}
                    />
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>Upload a JSON file</HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  </FormGroup>
                ) : null}
              </ExpandableSection>
            </fieldset>
          </Form>
        </FormProvider>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          data-testid="start-evaluation-submit"
          onClick={handleStart}
          isDisabled={!form.isValid || isSubmitting}
          isLoading={isSubmitting}
        >
          Start evaluation run
        </Button>
        <Button variant="link" data-testid="start-evaluation-cancel" onClick={handleClose}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StartEvaluationRunModal;
