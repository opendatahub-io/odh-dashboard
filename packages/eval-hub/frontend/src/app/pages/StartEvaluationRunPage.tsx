import * as React from 'react';
import {
  ActionGroup,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Button,
  Checkbox,
  Content,
  FileUpload,
  Form,
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  PageSection,
  Radio,
  Spinner,
  TextInput,
  EmptyState,
  EmptyStateBody,
  EmptyStateActions,
  EmptyStateFooter,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import {
  MlflowExperimentSelector,
  useMlflowExperiments,
  type MlflowExperiment,
} from '@odh-dashboard/internal/concepts/mlflow';
import {
  fireFormTrackingEvent,
  fireMiscTrackingEvent,
} from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { TrackingOutcome } from '@odh-dashboard/internal/concepts/analyticsTracking/trackingProperties';
import { createEvaluationJob } from '~/app/api/k8s';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import buildEvaluationRequest from '~/app/utils/buildEvaluationRequest';
import getErrorTitle from '~/app/utils/getErrorTitle';
import {
  evaluationsBaseRoute,
  evaluationBenchmarksRoute,
  evaluationCollectionsRoute,
  evaluationCreateRoute,
} from '~/app/routes';
import { useNotification } from '~/app/hooks/useNotification';
import { useEvaluationSelection } from '~/app/hooks/useEvaluationSelection';
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import InlineHelpIcon from '~/app/components/InlineHelpIcon';

type InputMode = 'inference' | 'prerecorded';
type ExperimentMode = 'existing' | 'new';

const DEFAULT_EXPERIMENT_NAME = 'EvalHub';
const EXPERIMENT_FILTER = "tags.context = 'eval-hub'";

const StartEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const notification = useNotification();

  const { benchmark, collection, isCollectionFlow, dataLoaded, loadError } =
    useEvaluationSelection(namespace);

  const { data: experiments, loaded: experimentsLoaded } = useMlflowExperiments({
    workspace: namespace ?? '',
    filter: EXPERIMENT_FILTER,
  });

  const [evaluationName, setEvaluationName] = React.useState(() =>
    new Date().toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }),
  );

  const [inputMode, setInputMode] = React.useState<InputMode>('inference');

  const [modelName, setModelName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [apiKeySecretRef, setApiKeySecretRef] = React.useState('');

  const [sourceName, setSourceName] = React.useState('');
  const [datasetUrl, setDatasetUrl] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');

  const [experimentMode, setExperimentMode] = React.useState<ExperimentMode>('existing');
  const [selectedExperiment, setSelectedExperiment] = React.useState<MlflowExperiment | undefined>(
    undefined,
  );
  const [newExperimentName, setNewExperimentName] = React.useState('');
  const [experimentAutoSelected, setExperimentAutoSelected] = React.useState(false);

  React.useEffect(() => {
    if (!experimentsLoaded || !namespace || experimentAutoSelected) {
      return;
    }
    setExperimentAutoSelected(true);

    if (experiments.length === 0) {
      setExperimentMode('new');
      setNewExperimentName(DEFAULT_EXPERIMENT_NAME);
    } else {
      const defaultExp = experiments.find((e) => e.name === DEFAULT_EXPERIMENT_NAME);
      setExperimentMode('existing');
      setSelectedExperiment(defaultExp ?? experiments[0]);
    }
  }, [experimentsLoaded, experiments, namespace, experimentAutoSelected]);

  const [showAdditionalArgs, setShowAdditionalArgs] = React.useState(false);
  const [additionalArgs, setAdditionalArgs] = React.useState('');
  const [additionalArgsFilename, setAdditionalArgsFilename] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const experimentManuallyChangedRef = React.useRef(false);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const benchmarkDisplayName = React.useMemo(() => {
    if (collection) {
      return collection.name;
    }
    if (benchmark) {
      return benchmark.name;
    }
    return '';
  }, [benchmark, collection]);

  const breadcrumbFlowLabel = isCollectionFlow ? 'Choose benchmark collection' : 'Single benchmark';

  const hasBenchmarks =
    !!benchmark || (!!collection && !!collection.benchmarks && collection.benchmarks.length > 0);

  const hasExperiment =
    (experimentMode === 'existing' && !!selectedExperiment) ||
    (experimentMode === 'new' && newExperimentName.trim() !== '');

  const isValid = React.useMemo(() => {
    if (evaluationName.trim() === '' || !hasBenchmarks || !hasExperiment) {
      return false;
    }
    if (inputMode === 'inference') {
      return modelName.trim() !== '' && endpointUrl.trim() !== '';
    }
    return sourceName.trim() !== '' && datasetUrl.trim() !== '';
  }, [
    evaluationName,
    inputMode,
    modelName,
    endpointUrl,
    sourceName,
    datasetUrl,
    hasBenchmarks,
    hasExperiment,
  ]);

  const handleAdditionalArgsFileChange = React.useCallback(
    (
      _event: React.DragEvent<HTMLElement> | React.ChangeEvent<HTMLInputElement> | Event,
      file: File,
    ) => {
      setAdditionalArgsFilename(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        setAdditionalArgs(text);
      };
      reader.onerror = () => {
        notification.error('File read failed', `Unable to read file "${file.name}".`);
        setAdditionalArgsFilename('');
      };
      reader.readAsText(file);
    },
    [notification],
  );

  const handleAdditionalArgsTextChange = React.useCallback(
    (_event: React.ChangeEvent<HTMLTextAreaElement>, value: string) => {
      setAdditionalArgs(value);
    },
    [],
  );

  const handleAdditionalArgsClear = React.useCallback(() => {
    setAdditionalArgsFilename('');
    setAdditionalArgs('');
  }, []);

  const handleSubmit = async () => {
    if (!isValid || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    const parsedArgs: Record<string, unknown> = {};
    if (showAdditionalArgs && additionalArgs.trim()) {
      try {
        const parsed: unknown = JSON.parse(additionalArgs);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          notification.error(
            'Invalid additional arguments',
            'Additional arguments must be a JSON object (e.g. {"key": "value"}).',
          );
          setIsSubmitting(false);
          return;
        }
        Object.assign(parsedArgs, parsed);
      } catch {
        notification.error(
          'Invalid additional arguments',
          'Additional arguments must be valid JSON.',
        );
        setIsSubmitting(false);
        return;
      }
    }

    const isNewExperiment = experimentMode === 'new';
    const experimentName = isNewExperiment ? newExperimentName.trim() : selectedExperiment?.name;

    const request = buildEvaluationRequest({
      evaluationName,
      inputMode,
      benchmark,
      collection,
      modelName,
      endpointUrl,
      apiKeySecretRef,
      sourceName,
      datasetUrl,
      accessToken,
      additionalArgs: parsedArgs,
      experimentName: experimentName || undefined,
      experimentTags: undefined,
    });

    fireMiscTrackingEvent(EVAL_HUB_EVENTS.MLFLOW_EXPERIMENT_SELECTED, {
      experimentSelection: isNewExperiment
        ? 'new'
        : !experimentManuallyChangedRef.current &&
            selectedExperiment?.name === DEFAULT_EXPERIMENT_NAME
          ? 'default'
          : 'existing',
      experimentName,
    });

    // Snapshot form state now so both success and error paths share the same properties.
    const runTrackingProps = {
      source: 'evaluations_page',
      evaluationName: evaluationName.trim(),
      sourceType:
        inputMode === 'inference'
          ? ('inference_endpoint' as const)
          : ('pre_recorded_responses' as const),
      modelName: inputMode === 'inference' ? modelName.trim() : undefined,
      endpointOrigin: (() => {
        if (inputMode !== 'inference') {
          return undefined;
        }
        try {
          return new URL(endpointUrl.trim()).origin;
        } catch {
          return undefined;
        }
      })(),
      hasAPIKey: inputMode === 'inference' ? apiKeySecretRef.trim() !== '' : false,
      sourceName: inputMode === 'prerecorded' ? sourceName.trim() : undefined,
      hasDatasetURL: inputMode === 'prerecorded' ? datasetUrl.trim() !== '' : false,
      hasAccessToken: inputMode === 'prerecorded' ? accessToken.trim() !== '' : false,
      hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
      countOfAdditionalArguments: Object.keys(parsedArgs).length,
    };

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createEvaluationJob('', namespace ?? '', request)({ signal: controller.signal });
      fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        ...runTrackingProps,
        outcome: TrackingOutcome.submit,
        success: true,
      });
      notification.success(
        'Evaluation started',
        `Evaluation "${evaluationName}" has been started.`,
      );
      navigate(evaluationsBaseRoute(namespace));
    } catch (e) {
      if (controller.signal.aborted) {
        return;
      }
      const message = e instanceof Error ? e.message : 'An unknown error occurred.';
      fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
        ...runTrackingProps,
        outcome: TrackingOutcome.submit,
        success: false,
        errorName: e instanceof Error ? e.name : 'UnknownError',
      });
      notification.error(getErrorTitle(e, 'Failed to start evaluation'), message);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <Button variant="primary" onClick={() => navigate(evaluationsBaseRoute(namespace))}>
                Return to evaluations
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      title="Start evaluation run"
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
        <Form style={{ maxWidth: 700 }} data-testid="start-evaluation-form">
          <FormGroup
            label={isCollectionFlow ? 'Benchmark suite name' : 'Benchmark name'}
            fieldId="benchmark-name"
          >
            <Content component="p" data-testid="benchmark-name-display">
              {benchmarkDisplayName}
            </Content>
          </FormGroup>

          <FormGroup label="Evaluation name" isRequired fieldId="evaluation-name">
            <TextInput
              id="evaluation-name"
              data-testid="evaluation-name-input"
              value={evaluationName}
              onChange={(_e, val) => setEvaluationName(val)}
              isRequired
            />
          </FormGroup>

          <FormGroup
            label="MLflow Experiment"
            isRequired
            fieldId="mlflow-experiment"
            labelHelp={
              <LabelHelpPopover
                ariaLabel="More info for MLflow experiment"
                content="Select an existing MLFlow experiment to log this evaluation run to, or create a new one. If you don't have any experiments, the default 'EvalHub' experiment will be used."
              />
            }
          >
            <Radio
              id="experiment-existing"
              data-testid="experiment-mode-existing"
              name="experiment-mode"
              label="Add to an existing experiment"
              isChecked={experimentMode === 'existing'}
              onChange={() => {
                setExperimentMode('existing');
                setNewExperimentName('');
                experimentManuallyChangedRef.current = true;
              }}
            />

            {experimentMode === 'existing' && namespace && (
              <div style={{ marginTop: 'var(--pf-t--global--spacer--sm)' }}>
                <MlflowExperimentSelector
                  workspace={namespace}
                  filter={EXPERIMENT_FILTER}
                  selection={selectedExperiment?.name}
                  onSelect={(exp) => {
                    setSelectedExperiment(exp);
                    experimentManuallyChangedRef.current = true;
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
                isChecked={experimentMode === 'new'}
                onChange={() => {
                  setExperimentMode('new');
                  setSelectedExperiment(undefined);
                  experimentManuallyChangedRef.current = true;
                }}
              />
            </div>

            {experimentMode === 'new' && (
              <div style={{ marginTop: 'var(--pf-t--global--spacer--md)' }}>
                <TextInput
                  id="new-experiment-name"
                  data-testid="new-experiment-name-input"
                  value={newExperimentName}
                  onChange={(_e, val) => setNewExperimentName(val)}
                  placeholder="Enter experiment name"
                />
              </div>
            )}
          </FormGroup>

          <FormSection title="Source">
            <Radio
              id="input-inference"
              data-testid="input-mode-inference"
              name="input-mode"
              label="Inference endpoint"
              isChecked={inputMode === 'inference'}
              onChange={() => setInputMode('inference')}
            />

            {inputMode === 'inference' && (
              <>
                <FormGroup label="Model or agent name" isRequired fieldId="model-name">
                  <TextInput
                    id="model-name"
                    data-testid="model-name-input"
                    value={modelName}
                    onChange={(_e, val) => setModelName(val)}
                    isRequired
                  />
                  <FormHelperText>
                    <HelperText>
                      <HelperTextItem>
                        The verbatim model or agent name from the deployment. Must match exactly.
                      </HelperTextItem>
                    </HelperText>
                  </FormHelperText>
                </FormGroup>

                <FormGroup label="Endpoint URL" isRequired fieldId="endpoint-url">
                  <TextInput
                    id="endpoint-url"
                    data-testid="endpoint-url-input"
                    value={endpointUrl}
                    onChange={(_e, val) => setEndpointUrl(val)}
                    placeholder="https://api.example.com/v1/model"
                    isRequired
                  />
                </FormGroup>

                <FormGroup label="API key" fieldId="api-key">
                  <TextInput
                    id="api-key"
                    data-testid="api-key-input"
                    value={apiKeySecretRef}
                    onChange={(_e, val) => setApiKeySecretRef(val)}
                    placeholder="e.g. my-model-credentials"
                  />
                </FormGroup>
              </>
            )}

            <Radio
              id="input-prerecorded"
              data-testid="input-mode-prerecorded"
              name="input-mode"
              label="Pre-recorded responses"
              isChecked={inputMode === 'prerecorded'}
              onChange={() => setInputMode('prerecorded')}
            />

            {inputMode === 'prerecorded' && (
              <>
                <FormGroup
                  label="Source name"
                  isRequired
                  fieldId="source-name"
                  labelHelp={
                    <LabelHelpPopover
                      ariaLabel="More info for source name"
                      content="Model or agent that was used to generate this dataset."
                    />
                  }
                >
                  <TextInput
                    id="source-name"
                    data-testid="source-name-input"
                    value={sourceName}
                    onChange={(_e, val) => setSourceName(val)}
                    isRequired
                  />
                </FormGroup>

                <FormGroup label="Dataset URL" isRequired fieldId="dataset-url">
                  <TextInput
                    id="dataset-url"
                    data-testid="dataset-url-input"
                    value={datasetUrl}
                    onChange={(_e, val) => setDatasetUrl(val)}
                    isRequired
                  />
                </FormGroup>

                <FormGroup
                  label="Access token secret name"
                  fieldId="access-token"
                  labelHelp={
                    <LabelHelpPopover
                      ariaLabel="More info for access token secret"
                      content="Name of the Kubernetes Secret that contains the access token for the dataset source."
                    />
                  }
                >
                  <TextInput
                    id="access-token"
                    data-testid="access-token-input"
                    value={accessToken}
                    onChange={(_e, val) => setAccessToken(val)}
                    placeholder="e.g. my-dataset-credentials"
                  />
                </FormGroup>
              </>
            )}
          </FormSection>

          <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
            <FlexItem>
              <Checkbox
                id="show-additional-args"
                data-testid="show-additional-args"
                label="Add additional arguments"
                isChecked={showAdditionalArgs}
                onChange={(_e, checked) => setShowAdditionalArgs(checked)}
              />
            </FlexItem>
            <FlexItem>
              <InlineHelpIcon
                ariaLabel="More info for additional arguments"
                content="Additional runtime arguments passed to the evaluation provider as a JSON object."
              />
            </FlexItem>
          </Flex>
          {showAdditionalArgs && (
            <FormGroup fieldId="additional-args">
              <FileUpload
                id="additional-args"
                data-testid="additional-args-upload"
                type="text"
                value={additionalArgs}
                filename={additionalArgsFilename}
                filenamePlaceholder="Drag and drop a file or upload"
                onFileInputChange={handleAdditionalArgsFileChange}
                onTextChange={handleAdditionalArgsTextChange}
                onClearClick={handleAdditionalArgsClear}
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
          )}

          <ActionGroup>
            <Button
              variant="primary"
              data-testid="start-evaluation-submit"
              onClick={handleSubmit}
              isDisabled={!isValid || isSubmitting}
              isLoading={isSubmitting}
            >
              Start evaluation run
            </Button>
            <Button
              variant="link"
              data-testid="start-evaluation-cancel"
              onClick={() => {
                fireFormTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RUN_STARTED, {
                  source: 'evaluations_page',
                  evaluationName: evaluationName.trim(),
                  sourceType:
                    inputMode === 'inference'
                      ? ('inference_endpoint' as const)
                      : ('pre_recorded_responses' as const),
                  hasAPIKey: inputMode === 'inference' ? apiKeySecretRef.trim() !== '' : false,
                  hasAdditionalArguments: showAdditionalArgs && additionalArgs.trim() !== '',
                  outcome: TrackingOutcome.cancel,
                });
                navigate(evaluationsBaseRoute(namespace));
              }}
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
