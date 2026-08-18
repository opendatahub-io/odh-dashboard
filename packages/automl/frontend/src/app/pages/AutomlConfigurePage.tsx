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
import React, { useCallback, useEffect, useState } from 'react';
import { FieldPath, FormProvider, useForm, useWatch } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router';
import AutomlHeader from '~/app/components/common/AutomlHeader/AutomlHeader';
import AutomlConfigure from '~/app/components/configure/AutomlConfigure';
import AutomlCreate from '~/app/components/create/AutomlCreate';
import InvalidProject from '~/app/components/empty-states/InvalidProject';
import { useNamespaceSelectorWithPersistence } from '~/app/hooks/useNamespaceSelectorWithPersistence';
import { useCreatePipelineRunMutation } from '~/app/hooks/mutations';
import { useNotification } from '~/app/hooks/useNotification';
import type { SecretSelection } from '~/app/components/common/SecretSelector';
import { ConfigureSchema, createConfigureSchema } from '~/app/schemas/configure.schema';
import { automlExperimentsPathname, automlResultsPathname } from '~/app/utilities/routes';
import {
  AUTOML_FAILURE_CATEGORY,
  fireAutomlFlowExited,
  fireAutomlRunCreated,
  fireAutomlRunDetailsDefined,
  fireAutomlRunReconfigured,
  mapOptimizationMetric,
  mapPredictionType,
  TrackingOutcome,
  type AutomlExitDestination,
  type AutomlFunnelStep,
  type RunActionSource,
} from '~/app/utilities/tracking';

const configureSchema = createConfigureSchema();
const createFields = ['display_name', 'description'] as const satisfies Array<
  FieldPath<ConfigureSchema>
>;

type AutomlConfigurePageProps = {
  initialValues?: Partial<ConfigureSchema>;
  /** Pre-resolved S3 connection secret for reconfigure flows. */
  initialInputDataSecret?: SecretSelection;
  /** When reconfiguring, the run ID of the source run (used for cancel navigation). */
  sourceRunId?: string;
  /** When reconfiguring, the display name of the source run (used in the page title). */
  sourceRunName?: string;
};

function AutomlConfigurePage({
  initialValues,
  initialInputDataSecret,
  sourceRunId,
  sourceRunName,
}: AutomlConfigurePageProps): React.JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const notification = useNotification();
  const locationFrom =
    location.state != null && typeof location.state === 'object' && 'from' in location.state
      ? location.state.from
      : undefined;
  const fromResultsPage = locationFrom === 'results';
  const reconfigureSource: RunActionSource | undefined =
    locationFrom === 'results'
      ? 'resultsPage'
      : locationFrom === 'runsList'
        ? 'runsList'
        : undefined;

  const { namespace } = useParams();
  const { namespaces, namespacesLoaded, namespacesLoadError } =
    useNamespaceSelectorWithPersistence();

  const noNamespaces = namespacesLoaded && namespaces.length === 0;
  const invalidNamespace =
    namespacesLoaded && !!namespace && !namespaces.map((ns) => ns.name).includes(namespace);

  const getRedirectPath = (ns: string) => `${automlExperimentsPathname}/${ns}`;

  const pipelineRunsMutation = useCreatePipelineRunMutation(namespace ?? '');

  // The actual baseline the form starts from — not just `initialValues`, which reconfigure
  // loaders may leave partially populated (e.g. `eval_metric` is omitted when it can't be
  // resolved from the source run's pipeline parameters). Diffing against raw `initialValues`
  // would treat every such omitted field as "changed" the instant the schema default resolves
  // to anything other than `undefined`, even with no user action at all.
  const initialFormValues = React.useMemo(
    () => ({ ...configureSchema.defaults, ...initialValues }),
    [initialValues],
  );

  const form = useForm({
    mode: 'onChange',
    resolver: zodResolver(configureSchema.full),
    defaultValues: initialFormValues,
  });

  const [displayName, description] = useWatch({
    control: form.control,
    name: createFields,
  });

  // Watched purely to compute `changedFieldsOnExit` below — mirrors the same four fields
  // `fireAutomlRunReconfigured` diffs at submit time, so abandon/cancel tracking reports the
  // same notion of "changed" as a successful (or failed) reconfigure submission would.
  const [watchedTaskType, watchedEvalMetric, watchedTargetColumn, watchedSecretName] = useWatch({
    control: form.control,
    name: ['task_type', 'eval_metric', 'target_column', 'train_data_secret_name'],
  });

  const [step, setStep] = useState<'create' | 'configure'>('create');
  const isRecommendedRef = React.useRef(true);
  const funnelStepRef = React.useRef<AutomlFunnelStep>('defineDetails');
  // Cancel is only rendered on step 'create'. `sourceRunId` is set for every reconfigure flow
  // (both results-page and runs-list origins), but `navigate(-1)` only lands on another AutoML
  // run's results page when reconfigure was entered from there — from the runs list, Cancel
  // returns to the experiments list. Use the origin, not the presence of sourceRunId.
  const cancelExitDestination: AutomlExitDestination = fromResultsPage
    ? 'otherAutoml'
    : 'experimentsList';

  // Only meaningful for reconfigure: the configure screen starts fully populated, so unlike the
  // create flow there's no "how far did they get" to report — instead report whether the user
  // changed anything before leaving. `undefined` (rather than `''`) for the create flow, so the
  // field is omitted from that event entirely instead of always reporting "no changes".
  const changedFieldsOnExit = React.useMemo(() => {
    if (!sourceRunId) {
      return undefined;
    }
    const fields: string[] = [];
    if (watchedTaskType !== initialFormValues.task_type) {
      fields.push('predictionType');
    }
    if (watchedEvalMetric !== initialFormValues.eval_metric) {
      fields.push('optimizationMetric');
    }
    if (watchedTargetColumn !== initialFormValues.target_column) {
      fields.push('targetColumn');
    }
    if (watchedSecretName !== initialFormValues.train_data_secret_name) {
      fields.push('s3Connection');
    }
    return fields.join(',');
  }, [
    sourceRunId,
    watchedTaskType,
    watchedEvalMetric,
    watchedTargetColumn,
    watchedSecretName,
    initialFormValues,
  ]);
  // Kept in a ref (like funnelStepRef) so the beforeunload listener below — registered once,
  // with an empty dependency array — always reads the latest value instead of a stale closure.
  const changedFieldsOnExitRef = React.useRef(changedFieldsOnExit);
  useEffect(() => {
    changedFieldsOnExitRef.current = changedFieldsOnExit;
  }, [changedFieldsOnExit]);

  useEffect(() => {
    if (step === 'configure') {
      // Reconfigure's configure screen is fully populated on mount, so there's no equivalent
      // to the create flow's progressive trainingData → predictionType unlocking — it's always
      // just 'configure', with changedFieldsOnExit carrying the meaningful signal instead.
      funnelStepRef.current = sourceRunId ? 'configure' : 'trainingData';
    }
  }, [step, sourceRunId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      fireAutomlFlowExited(
        'abandon',
        funnelStepRef.current,
        'none',
        changedFieldsOnExitRef.current,
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const onCancel = useCallback(() => {
    fireAutomlRunDetailsDefined(TrackingOutcome.cancel, Boolean(description?.trim()));
    fireAutomlFlowExited(
      'navigate',
      funnelStepRef.current,
      cancelExitDestination,
      changedFieldsOnExitRef.current,
    );
    navigate(-1);
  }, [navigate, description, cancelExitDestination]);

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
          type="submit"
          variant="primary"
          data-testid="automl-next-button"
          isDisabled={
            !configureSchema.base.shape.display_name.safeParse(displayName).success ||
            !configureSchema.base.shape.description.safeParse(description).success
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
          type="submit"
          variant="primary"
          data-testid="automl-create-run-button"
          isDisabled={!form.formState.isValid || form.formState.isSubmitting}
        >
          {sourceRunId ? 'Create new run' : 'Create run'}
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button variant="link" onClick={handleBackToCreate}>
          Back
        </Button>
      </ActionListItem>
    </>
  );

  return (
    <ApplicationsPage
      title={<AutomlHeader />}
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
              'Create AutoML optimization run'
            )
          ) : (
            <span data-testid="configure-step-subtitle">
              Run &ldquo;
              <Truncate content={displayName || ''} />
              &rdquo; AutoML experiment
            </span>
          )}
        </h2>
      }
      description={
        step === 'create' ? (
          <Content>
            Automatically configure and optimize your machine learning workflows.
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
                  fireAutomlFlowExited(
                    'navigate',
                    funnelStepRef.current,
                    'experimentsList',
                    changedFieldsOnExitRef.current,
                  )
                }
              >
                AutoML: {namespace}
              </Link>
            </BreadcrumbItem>
            {fromResultsPage && sourceRunId && sourceRunName && (
              <BreadcrumbItem data-testid="configure-breadcrumb-source-run">
                <Link
                  to={`${automlResultsPathname}/${namespace}/${sourceRunId}`}
                  onClick={() =>
                    fireAutomlFlowExited(
                      'navigate',
                      funnelStepRef.current,
                      'otherAutoml',
                      changedFieldsOnExitRef.current,
                    )
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
        <Stack
          component="form"
          className={classNames('pf-v6-u-h-0', 'pf-v6-u-flex-fill')}
          hasGutter
          noValidate
          onSubmit={(event) => {
            event.preventDefault();

            if (step === 'create') {
              fireAutomlRunDetailsDefined(TrackingOutcome.submit, Boolean(description?.trim()));
              setStep('configure');
              return;
            }

            form.handleSubmit(
              async (data: ConfigureSchema) => {
                const trackingProperties = {
                  predictionType: mapPredictionType(data.task_type),
                  optimizationMetric: mapOptimizationMetric(data.eval_metric),
                  isRecommended: isRecommendedRef.current,
                };
                // Computed up front (before the mutation) so it's available in both the
                // success and failure branches below — the failure branch needs to report
                // what the user actually changed, not an empty diff.
                const changedFields: string[] = [];
                if (sourceRunId) {
                  // Diffed against `initialFormValues` (the form's actual starting point),
                  // not the raw `initialValues` prop — see its definition above for why.
                  if (data.task_type !== initialFormValues.task_type) {
                    changedFields.push('predictionType');
                  }
                  if (data.eval_metric !== initialFormValues.eval_metric) {
                    changedFields.push('optimizationMetric');
                  }
                  // The submit transformer deletes `target_column`, moving its value to
                  // `target` (timeseries) or `label_column` (tabular) — compare against
                  // whichever one is populated post-transform.
                  if ((data.target ?? data.label_column) !== initialFormValues.target_column) {
                    changedFields.push('targetColumn');
                  }
                  if (data.train_data_secret_name !== initialFormValues.train_data_secret_name) {
                    changedFields.push('s3Connection');
                  }
                }
                try {
                  const pipelineRun = await pipelineRunsMutation.mutateAsync(data);
                  if (sourceRunId) {
                    fireAutomlRunReconfigured({
                      ...trackingProperties,
                      changedFields,
                      outcome: TrackingOutcome.submit,
                      success: true,
                      source: reconfigureSource,
                    });
                  } else {
                    fireAutomlRunCreated({
                      ...trackingProperties,
                      outcome: TrackingOutcome.submit,
                      success: true,
                    });
                  }
                  navigate(`${automlResultsPathname}/${namespace}/${pipelineRun.run_id}`, {
                    state: { entrySource: 'direct' },
                  });
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : '';
                  if (sourceRunId) {
                    fireAutomlRunReconfigured({
                      ...trackingProperties,
                      changedFields,
                      outcome: TrackingOutcome.submit,
                      success: false,
                      error: AUTOML_FAILURE_CATEGORY,
                      source: reconfigureSource,
                    });
                  } else {
                    fireAutomlRunCreated({
                      ...trackingProperties,
                      outcome: TrackingOutcome.submit,
                      success: false,
                      error: AUTOML_FAILURE_CATEGORY,
                    });
                  }
                  notification.error('Failed to create pipeline run', errorMessage);
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
                <AutomlCreate />
              ) : (
                <AutomlConfigure
                  initialValues={initialValues}
                  initialInputDataSecret={initialInputDataSecret}
                  onRecommendationChange={(isRecommended) => {
                    isRecommendedRef.current = isRecommended;
                  }}
                  // Reconfigure's configure screen has no genuine sub-step progression to
                  // report (see funnelStepRef effect above) — only wire this up for the
                  // create-run flow, so a pre-populated reconfigure target column can't
                  // advance funnelStepRef the way it used to.
                  onFunnelStepChange={
                    sourceRunId
                      ? undefined
                      : (funnelStep) => {
                          funnelStepRef.current = funnelStep;
                        }
                  }
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
      </FormProvider>
    </ApplicationsPage>
  );
}

export default AutomlConfigurePage;
