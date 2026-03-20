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
  TextArea,
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
import { createEvaluationJob } from '~/app/api/k8s';
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

const StartEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const notification = useNotification();

  const { benchmark, collection, isCollectionFlow, dataLoaded, loadError } =
    useEvaluationSelection(namespace);

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
  const [description, setDescription] = React.useState('');
  const [inputMode, setInputMode] = React.useState<InputMode>('inference');

  const [modelName, setModelName] = React.useState('');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [apiKeySecretRef, setApiKeySecretRef] = React.useState('');

  const [sourceName, setSourceName] = React.useState('');
  const [datasetUrl, setDatasetUrl] = React.useState('');
  const [accessToken, setAccessToken] = React.useState('');

  const [showAdditionalArgs, setShowAdditionalArgs] = React.useState(false);
  const [additionalArgs, setAdditionalArgs] = React.useState('');
  const [additionalArgsFilename, setAdditionalArgsFilename] = React.useState('');

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController | null>(null);

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

  const isValid = React.useMemo(() => {
    if (evaluationName.trim() === '' || !hasBenchmarks) {
      return false;
    }
    if (inputMode === 'inference') {
      return modelName.trim() !== '' && endpointUrl.trim() !== '';
    }
    return sourceName.trim() !== '' && datasetUrl.trim() !== '';
  }, [evaluationName, inputMode, modelName, endpointUrl, sourceName, datasetUrl, hasBenchmarks]);

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

    const request = buildEvaluationRequest({
      evaluationName,
      description,
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
    });

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await createEvaluationJob('', namespace ?? '', request)({ signal: controller.signal });
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

          <FormGroup label="Description" fieldId="description">
            <TextArea
              id="description"
              data-testid="description-input"
              resizeOrientation="vertical"
              value={description}
              onChange={(_e, val) => setDescription(val)}
            />
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
                <FormGroup
                  label="Model or agent name"
                  isRequired
                  fieldId="model-name"
                  labelHelp={
                    <LabelHelpPopover
                      ariaLabel="More info for model name"
                      content="This should match the resource name that was created when the model or app was deployed."
                    />
                  }
                >
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
                textAreaPlaceholder={
                  '{\n  "num_examples": 10,\n  "experiment": {\n    "name": "my-experiment"\n  }\n}'
                }
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
              onClick={() => navigate(evaluationsBaseRoute(namespace))}
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
