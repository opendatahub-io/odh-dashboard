import { zodResolver } from '@hookform/resolvers/zod';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Content,
  PageSection,
  Stack,
  StackItem,
  Truncate,
} from '@patternfly/react-core';
import classNames from 'classnames';
import { ApplicationsPage } from 'mod-arch-shared';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldPath, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import AutoragConfigure from '~/app/components/configure/AutoragConfigure';
import AutoragHeader from '~/app/components/common/AutoragHeader/AutoragHeader';
import AutoragCreate from '~/app/components/create/AutoragCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useCreatePipelineRunMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import type { SecretSelection } from '~/app/components/common/SecretSelector';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { autoragExperimentsPathname, autoragResultsPathname } from '~/app/utilities/routes';
import {
  AUTORAG_FAILURE_CATEGORY,
  fireAutoragExperimentCreated,
  fireAutoragFlowExited,
  fireAutoragRunTriggered,
  mapOptimizationMetric,
  TrackingOutcome,
  type AutoragExitDestination,
  type AutoragFunnelStep,
  type EvaluationSourceType,
  type KnowledgeSourceType,
  type VectorStoreProviderType,
} from '~/app/utilities/tracking';
import {
  RunTriggeredTrackingContext,
  type RunTriggeredTrackingContextProps,
} from '~/app/context/RunTriggeredTrackingContext';
import { useCatchUIError } from '~/app/components/common/UIError/UIErrorHandler.tsx';

const configureSchema = createConfigureSchema();
const createFields = ['display_name', 'description', 'ogx_secret_name'] as const satisfies Array<
  FieldPath<ConfigureSchema>
>;

type AutoragConfigurePageProps = {
  initialValues?: Partial<ConfigureSchema>;
  /** Pre-resolved S3 connection secret for reconfigure flows. */
  initialInputDataSecret?: SecretSelection;
  /** Pre-resolved Open GenAI Stack connection secret for reconfigure flows. */
  initialOgxSecret?: SecretSelection;
  /** When reconfiguring, the run ID of the source run (used for cancel navigation). */
  sourceRunId?: string;
  /** When reconfiguring, the display name of the source run (used in the page title). */
  sourceRunName?: string;
};

function AutoragConfigurePage({
  initialValues,
  initialInputDataSecret,
  initialOgxSecret,
  sourceRunId,
  sourceRunName,
}: AutoragConfigurePageProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const notification = useNotification();
  const fromResultsPage =
    location.state != null &&
    typeof location.state === 'object' &&
    'from' in location.state &&
    location.state.from === 'results';

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();
  const catchUIError = useCatchUIError();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${autoragExperimentsPathname}/${ns}`;

  const pipelineRunsMutation = useCreatePipelineRunMutation(namespace ?? '');

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: { ...configureSchema.defaults, ...initialValues },
  });

  const [displayName, description, ogxSecretName] = useWatch({
    control: form.control,
    name: createFields,
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');

  // Populated by the Knowledge/Evaluation/Vector-store selectors via RunTriggeredTrackingContext
  // when the user actually (re)selects a source/provider in this session — see the context's
  // doc comment for why this can't be safely derived from form data alone. Read at submit time
  // to build the "AutoRAG Run Triggered" event; not reset between submits since a failed
  // pipeline-run creation should still report the last known selection on retry.
  const knowledgeSourceTypeRef = useRef<KnowledgeSourceType>();
  const evaluationSourceTypeRef = useRef<EvaluationSourceType>();
  const vectorDatabaseRef = useRef<VectorStoreProviderType>();

  // How far the user has actually gotten in the configure flow, for "AutoRAG Flow Exited".
  // Advances monotonically (never regresses) as knowledge/evaluation/models milestones complete
  // — see `AutoragFunnelStep`'s doc comment for why these can complete in any order here, unlike
  // automl's strictly-gated sections.
  const funnelStepRef = useRef<AutoragFunnelStep>('defineDetails');
  const completedMilestonesRef = useRef({ knowledge: false, evaluation: false, models: false });
  const FUNNEL_STEP_RANK: Record<AutoragFunnelStep, number> = {
    defineDetails: 0,
    knowledge: 1,
    evaluation: 2,
    models: 3,
    run: 4,
  };
  const advanceFunnelStep = (nextStep: AutoragFunnelStep) => {
    if (FUNNEL_STEP_RANK[nextStep] > FUNNEL_STEP_RANK[funnelStepRef.current]) {
      funnelStepRef.current = nextStep;
    }
  };
  const markMilestoneComplete = (
    milestone: 'knowledge' | 'evaluation' | 'models',
    funnelStep: AutoragFunnelStep,
  ) => {
    completedMilestonesRef.current[milestone] = true;
    advanceFunnelStep(funnelStep);
    const { knowledge, evaluation, models } = completedMilestonesRef.current;
    if (knowledge && evaluation && models) {
      advanceFunnelStep('run');
    }
  };

  // Cancel is only rendered on step 'create'. `sourceRunId` is set for every reconfigure flow
  // (both results-page and runs-list origins), but `navigate(-1)` only lands back on the source
  // run's results page (still part of this same package) when reconfigure was entered from
  // there — from the runs list, Cancel returns to the experiments list. There's no dedicated
  // "back to this package's own results page" bucket in the exitDestination taxonomy, so this
  // is reported as 'otherGenAi' (elsewhere in Gen AI Studio, not the AutoRAG list) — the same
  // bucket used for the source-run breadcrumb link below.
  const cancelExitDestination: AutoragExitDestination = fromResultsPage
    ? 'otherGenAi'
    : 'experimentsList';

  // Reconfigure's configure screen is fully populated on mount, so there's no equivalent to the
  // create flow's progressive knowledge → evaluation → models milestones to observe — the form
  // starts ready to submit, so report the deepest funnel step immediately. For the create flow,
  // reset on every (re-)entry to 'configure': `handleBackToCreate` clears the knowledge/
  // evaluation/models field values, so without this reset, a Back → Next round-trip after
  // completing a milestone would leave funnel progress reporting a selection that no longer
  // exists in the form.
  useEffect(() => {
    if (step === 'configure') {
      if (sourceRunId) {
        funnelStepRef.current = 'run';
      } else {
        funnelStepRef.current = 'defineDetails';
        completedMilestonesRef.current = { knowledge: false, evaluation: false, models: false };
      }
    }
  }, [step, sourceRunId]);

  // Catches a full page/tab close or refresh while the configure flow is in progress. Does not
  // catch in-app navigation away (e.g. the host dashboard's global nav) — see
  // `fireAutoragFlowExited`'s doc comment for why that isn't covered.
  useEffect(() => {
    const handleBeforeUnload = () => {
      fireAutoragFlowExited('abandon', funnelStepRef.current, 'none');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const runTriggeredTrackingContextValue = useMemo<RunTriggeredTrackingContextProps>(
    () => ({
      onKnowledgeSourceConfigured: (sourceType) => {
        knowledgeSourceTypeRef.current = sourceType;
        markMilestoneComplete('knowledge', 'knowledge');
      },
      onEvaluationSourceConfigured: (sourceType) => {
        evaluationSourceTypeRef.current = sourceType;
        markMilestoneComplete('evaluation', 'evaluation');
      },
      onVectorStoreConfigured: (providerType) => {
        vectorDatabaseRef.current = providerType;
      },
      onModelsConfigured: () => {
        markMilestoneComplete('models', 'models');
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- markMilestoneComplete/advanceFunnelStep only ever touch refs, so they're safe to omit; including them would recreate this context value (and downstream consumers) on every render.
    [],
  );

  const onCancel = useCallback(() => {
    if (step === 'create') {
      fireAutoragExperimentCreated({
        outcome: TrackingOutcome.cancel,
        hasDescription: !!description,
        success: true,
      });
    }
    fireAutoragFlowExited('navigate', funnelStepRef.current, cancelExitDestination);
    navigate(-1);
  }, [navigate, step, description, cancelExitDestination]);

  const handleBackToCreate = useCallback(() => {
    // New runs only: clear configure-step values so Back → Next does not show stale S3/file UI.
    // Reconfigure keeps form state so users can edit step 1 without losing step 2 selections.
    if (!sourceRunId) {
      const createFieldSet = new Set<string>(createFields);
      type DefaultKey = keyof typeof configureSchema.defaults;
      const isDefaultKey = (key: string): key is DefaultKey => key in configureSchema.defaults;
      for (const key of Object.keys(configureSchema.defaults)) {
        if (!createFieldSet.has(key) && isDefaultKey(key)) {
          form.setValue(key, configureSchema.defaults[key], { shouldValidate: false });
        }
      }
    }
    setStep('create');
  }, [form, sourceRunId]);

  const createActions = (
    <>
      <ActionListItem>
        <Button
          data-testid="autorag-next-button"
          type="submit"
          variant="primary"
          isDisabled={
            !configureSchema.base.shape.display_name.safeParse(displayName).success ||
            !configureSchema.base.shape.description.safeParse(description).success ||
            !configureSchema.base.shape.ogx_secret_name.safeParse(ogxSecretName).success
          }
        >
          Next
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button variant="link" onClick={onCancel}>
          Cancel
        </Button>
      </ActionListItem>
    </>
  );

  const configureActions = (
    <>
      <ActionListItem>
        <Button
          data-testid="autorag-create-run-button"
          type="submit"
          variant="primary"
          isDisabled={!form.formState.isValid || form.formState.isSubmitting}
          isLoading={form.formState.isSubmitting}
          spinnerAriaValueText="Submitting"
        >
          {sourceRunId ? 'Create new run' : 'Create run'}
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          isDisabled={form.formState.isSubmitting}
          onClick={handleBackToCreate}
        >
          Back
        </Button>
      </ActionListItem>
    </>
  );

  return (
    <ApplicationsPage
      title={<AutoragHeader />}
      subtext={
        <h2 className="pf-v6-u-mt-sm">
          {step === 'create' ? (
            sourceRunId && sourceRunName ? (
              <>
                Reconfigure &quot;
                <Truncate content={sourceRunName} />
                &quot;
              </>
            ) : (
              'Create AutoRAG optimization run'
            )
          ) : (
            <span data-testid="configure-step-subtitle">
              Run &ldquo;
              <Truncate content={displayName || ''} />
              &rdquo; AutoRAG experiment
            </span>
          )}
        </h2>
      }
      description={
        step === 'create' ? (
          <Content>
            Automatically test and tune retrieval, indexing, and model settings to improve
            Retrieval-Augmented Generation (RAG) response quality.
            {sourceRunId && (
              <>
                <br />
                Settings from the previous run have been automatically populated. You can modify any
                configurations as needed.
              </>
            )}
          </Content>
        ) : (
          <Content>Configure details for this experiment run.</Content>
        )
      }
      breadcrumb={
        (step === 'configure' || sourceRunId) && (
          <Breadcrumb>
            <BreadcrumbItem>
              <Link
                to={getRedirectPath(namespace!)}
                onClick={() =>
                  fireAutoragFlowExited('navigate', funnelStepRef.current, 'experimentsList')
                }
              >
                AutoRAG: {namespace}
              </Link>
            </BreadcrumbItem>
            {fromResultsPage && sourceRunId && sourceRunName && (
              <BreadcrumbItem data-testid="configure-breadcrumb-source-run">
                <Link
                  to={`${autoragResultsPathname}/${namespace}/${sourceRunId}`}
                  onClick={() =>
                    fireAutoragFlowExited('navigate', funnelStepRef.current, 'otherGenAi')
                  }
                >
                  <Truncate content={sourceRunName} />
                </Link>
              </BreadcrumbItem>
            )}
            <BreadcrumbItem isActive data-testid="configure-breadcrumb-name">
              {sourceRunId ? 'Reconfigure' : <Truncate content={displayName || ''} />}
            </BreadcrumbItem>
          </Breadcrumb>
        )
      }
      empty={noNamespaces || invalidNamespace}
      emptyStatePage={<InvalidProject namespace={namespace} getRedirectPath={getRedirectPath} />}
      loadError={namespacesLoadError}
      loaded={namespacesLoaded}
    >
      <FormProvider {...form}>
        <RunTriggeredTrackingContext.Provider value={runTriggeredTrackingContextValue}>
          <Stack
            component="form"
            className={classNames('pf-v6-u-h-0', 'pf-v6-u-flex-fill')}
            hasGutter
            noValidate
            onSubmit={(event) => {
              event.preventDefault();

              if (step === 'create') {
                fireAutoragExperimentCreated({
                  outcome: TrackingOutcome.submit,
                  hasDescription: !!description,
                  success: true,
                });
                setStep('configure');
                return;
              }

              form.handleSubmit(
                async (data: ConfigureSchema) => {
                  // Computed up front so it's available in both the success and failure branches
                  // below — only the values that must come from `data` (not from the tracking
                  // refs) live here, so a failed submission still reports accurate model/metric
                  // counts even though the pipeline run itself never happened.
                  const runTrackingProperties = {
                    knowledgeSourceType: knowledgeSourceTypeRef.current,
                    evaluationSourceType: evaluationSourceTypeRef.current,
                    optimizationMetric: mapOptimizationMetric(data.optimization_metric),
                    vectorDatabase: vectorDatabaseRef.current,
                    countOfModels: data.generation_models.length + data.embedding_models.length,
                    countOfKnowledgeDocuments: data.input_data_key ? 1 : 0,
                    countOfEvaluationDocuments: data.test_data_key ? 1 : 0,
                    countOfFoundationModels: data.generation_models.length,
                    countOfEmbeddingModels: data.embedding_models.length,
                    hasS3Connection:
                      knowledgeSourceTypeRef.current === 's3' ||
                      evaluationSourceTypeRef.current === 's3',
                  };
                  try {
                    const pipelineRun = await pipelineRunsMutation.mutateAsync(data);
                    fireAutoragRunTriggered({
                      ...runTrackingProperties,
                      outcome: TrackingOutcome.submit,
                      success: true,
                    });
                    navigate(`${autoragResultsPathname}/${namespace}/${pipelineRun.run_id}`);
                  } catch (error) {
                    fireAutoragRunTriggered({
                      ...runTrackingProperties,
                      outcome: TrackingOutcome.submit,
                      success: false,
                      error: AUTORAG_FAILURE_CATEGORY,
                    });
                    catchUIError(error, () =>
                      notification.error(
                        'Failed to create pipeline run',
                        error instanceof Error ? error.message : '',
                      ),
                    );
                  }
                },
                // this `onInvalid` case should be impossible to hit
                // since we disable the button when the form is invalid
                () => notification.error('Form is invalid'),
              )();
            }}
          >
            <StackItem className="pf-v6-u-h-0" isFilled>
              <PageSection
                className={classNames(
                  'pf-v6-c-form',
                  'pf-v6-u-py-0',
                  step === 'configure' && 'pf-v6-u-h-100',
                )}
                hasBodyWrapper={false}
              >
                {step === 'create' ? (
                  <AutoragCreate initialOgxSecret={initialOgxSecret} />
                ) : (
                  <AutoragConfigure
                    initialValues={initialValues}
                    initialInputDataSecret={initialInputDataSecret}
                  />
                )}
              </PageSection>
            </StackItem>
            <StackItem>
              <PageSection hasBodyWrapper={false} hasShadowTop>
                <ActionList>
                  <ActionListGroup>
                    {step === 'create' ? createActions : configureActions}
                  </ActionListGroup>
                </ActionList>
              </PageSection>
            </StackItem>
          </Stack>
        </RunTriggeredTrackingContext.Provider>
      </FormProvider>
    </ApplicationsPage>
  );
}

export default AutoragConfigurePage;
