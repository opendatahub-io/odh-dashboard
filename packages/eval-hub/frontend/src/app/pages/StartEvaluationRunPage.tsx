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
  HelperText,
  HelperTextItem,
  PageSection,
  Radio,
  Spinner,
  Stack,
  StackItem,
  TextInput,
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
import LabelHelpPopover from '~/app/components/LabelHelpPopover';
import BenchmarkThresholdField from '~/app/components/BenchmarkThresholdField';
import PrimaryScorerMetricField from '~/app/components/PrimaryScorerMetricField';
import {
  useStartEvaluationRunForm,
  EXPERIMENT_FILTER,
  DEFAULT_EXPERIMENT_NAME,
} from './useStartEvaluationRunForm';

import './StartEvaluationRunPage.css';

const StartEvaluationRunPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  const { benchmark, collection, isCollectionFlow, dataLoaded, loadError } =
    useEvaluationSelection(namespace);

  const { data: experiments, loaded: experimentsLoaded } = useMlflowExperiments({
    workspace: namespace ?? '',
    filter: EXPERIMENT_FILTER,
  });

  const form = useStartEvaluationRunForm({
    namespace,
    benchmark,
    collection,
    isCollectionFlow,
    experiments,
    experimentsLoaded,
  });

  const breadcrumbFlowLabel = isCollectionFlow ? 'Select benchmark suite' : 'Select benchmark';

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
          <FormGroup label="Evaluation name" isRequired fieldId="evaluation-name">
            <TextInput
              id="evaluation-name"
              data-testid="evaluation-name-input"
              value={form.evaluationName}
              onChange={(_e, val) => form.setEvaluationName(val)}
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

          <FormGroup
            label="Source"
            fieldId="source-input-mode"
            role="group"
            style={{ marginBlockStart: 'var(--pf-t--global--spacer--sm)' }}
          >
            <Radio
              id="input-inference"
              data-testid="input-mode-inference"
              name="input-mode"
              label="Inference endpoint"
              isChecked={form.inputMode === 'inference'}
              onChange={() => form.setInputMode('inference')}
              className="eval-hub-start-evaluation-run__source-inference-radio"
              body={
                form.inputMode === 'inference' ? (
                  <Stack hasGutter>
                    <StackItem>
                      <FormGroup label="Model or agent name" isRequired fieldId="model-name">
                        <TextInput
                          id="model-name"
                          data-testid="model-name-input"
                          value={form.modelName}
                          onChange={(_e, val) => form.setModelName(val)}
                          isRequired
                        />
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem>
                              The model or agent name is case-sensitive.
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      </FormGroup>
                    </StackItem>
                    <StackItem>
                      <FormGroup label="Endpoint URL" isRequired fieldId="endpoint-url">
                        <TextInput
                          id="endpoint-url"
                          data-testid="endpoint-url-input"
                          value={form.endpointUrl}
                          onChange={(_e, val) => form.setEndpointUrl(val)}
                          placeholder="https://api.example.com/v1/model"
                          isRequired
                        />
                      </FormGroup>
                    </StackItem>
                    <StackItem>
                      <FormGroup
                        label="API key secret name"
                        fieldId="api-key"
                        labelHelp={
                          <LabelHelpPopover
                            ariaLabel="More info for API key secret name"
                            content="The name of the Kubernetes Secret that contains your API key. The secret is stored securely in your cluster and referenced by name — the actual key value is never exposed in the evaluation configuration."
                          />
                        }
                      >
                        <TextInput
                          id="api-key"
                          data-testid="api-key-input"
                          value={form.apiKeySecretRef}
                          onChange={(_e, val) => form.setApiKeySecretRef(val)}
                        />
                      </FormGroup>
                    </StackItem>
                  </Stack>
                ) : undefined
              }
            />

            <Radio
              id="input-prerecorded"
              data-testid="input-mode-prerecorded"
              name="input-mode"
              label="Pre-recorded responses"
              isChecked={form.inputMode === 'prerecorded'}
              onChange={() => form.setInputMode('prerecorded')}
              body={
                form.inputMode === 'prerecorded' ? (
                  <Stack hasGutter>
                    <StackItem>
                      <FormGroup
                        label="Source name"
                        isRequired
                        fieldId="source-name"
                        labelHelp={
                          <LabelHelpPopover
                            ariaLabel="More info for source name"
                            content="Enter the name of the tool or agent used to generate the response. This is for your reference only."
                          />
                        }
                      >
                        <TextInput
                          id="source-name"
                          data-testid="source-name-input"
                          value={form.sourceName}
                          onChange={(_e, val) => form.setSourceName(val)}
                          isRequired
                        />
                      </FormGroup>
                    </StackItem>
                    <StackItem>
                      <FormGroup label="Dataset URL" isRequired fieldId="dataset-url">
                        <TextInput
                          id="dataset-url"
                          data-testid="dataset-url-input"
                          value={form.datasetUrl}
                          onChange={(_e, val) => form.setDatasetUrl(val)}
                          isRequired
                        />
                      </FormGroup>
                    </StackItem>
                    <StackItem>
                      <FormGroup
                        label="Access token"
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
                          value={form.accessToken}
                          onChange={(_e, val) => form.setAccessToken(val)}
                          placeholder="e.g. my-dataset-credentials"
                        />
                      </FormGroup>
                    </StackItem>
                  </Stack>
                ) : undefined
              }
            />
          </FormGroup>

          <FormGroup
            label={isCollectionFlow ? 'Benchmark suite' : 'Benchmark'}
            fieldId="benchmark-name"
          >
            <Content component="p" data-testid="benchmark-name-display">
              {form.benchmarkDisplayName}
            </Content>
          </FormGroup>

          <BenchmarkThresholdField
            value={form.threshold}
            onChange={form.handleThresholdChange}
            label={isCollectionFlow ? 'Benchmark suite threshold' : 'Benchmark threshold'}
            fieldId="benchmark-threshold"
          />

          {!isCollectionFlow && form.availableMetrics.length > 0 && (
            <PrimaryScorerMetricField
              metrics={form.availableMetrics}
              selected={form.primaryMetric}
              onChange={form.handlePrimaryMetricChange}
            />
          )}

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
          {form.showAdditionalArgs && (
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
          )}

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
