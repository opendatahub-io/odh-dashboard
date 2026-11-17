/* eslint-disable camelcase */
import * as React from 'react';
import { BreadcrumbItem, PageSection, Wizard, WizardStep } from '@patternfly/react-core';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import CollectionGenerationStep from '~/app/components/suiteBuilder/CollectionGenerationStep';
import DefineGoalStep from '~/app/components/suiteBuilder/DefineGoalStep';
import SuiteBuilderFooter from '~/app/components/suiteBuilder/SuiteBuilderFooter';
import SuiteSettingsStep from '~/app/components/suiteBuilder/SuiteSettingsStep';
import useCollectionGeneration from '~/app/hooks/useCollectionGeneration';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';
import {
  evaluationCreateSuiteChooserRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import {
  suiteBuilderDefaultValues,
  suiteBuilderSchema,
  defineGoalFieldNames,
  defineGoalSchema,
  suiteSettingsFieldNames,
  suiteSettingsSchema,
  benchmarkOverviewSchema,
  type SuiteBuilderFormValues,
} from '~/app/schemas/suiteBuilder.schema';
import type { CollectionBenchmark, CollectionGenerationRequest } from '~/app/types';

import './CreateSuiteFromGoalPage.scss';

const CreateSuiteFromGoalPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const projectDisplayName = useProjectDisplayName(namespace);
  const {
    generationId,
    generation,
    isLoading: isGenerationLoading,
    isStarting,
    isStopping,
    createError,
    deleteError,
    pollError,
    startGeneration,
    deleteActiveGeneration,
    stopGeneration,
    clearGeneration,
    resetMutations,
    retryPoll,
  } = useCollectionGeneration(namespace);
  const {
    inferenceServices,
    loaded: inferenceServicesLoaded,
    loadError: inferenceServicesError,
  } = useInferenceServices(namespace ?? '');
  const [submittedRequestFingerprint, setSubmittedRequestFingerprint] = React.useState<string>();
  const [hasVisitedOverview, setHasVisitedOverview] = React.useState(false);
  const initializedGenerationId = React.useRef<string>();
  const methods = useForm<SuiteBuilderFormValues>({
    defaultValues: suiteBuilderDefaultValues,
    resolver: zodResolver(suiteBuilderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const [suiteName, suiteDescription, maxBenchmarks, strictness, generationEffort] = useWatch({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
  });
  const [evaluationGoal, generatorModel] = useWatch({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  const selectedBenchmarks = useWatch({ control: methods.control, name: 'selectedBenchmarks' });
  const { errors } = useFormState({
    control: methods.control,
    name: [...suiteSettingsFieldNames],
  });
  const { errors: defineGoalErrors } = useFormState({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  const isSuiteSettingsValid = suiteSettingsSchema.safeParse({
    suiteName,
    suiteDescription,
    maxBenchmarks,
    strictness,
    generationEffort,
  }).success;
  const hasSuiteSettingsErrors = suiteSettingsFieldNames.some((fieldName) => errors[fieldName]);
  const canContinueSettings = isSuiteSettingsValid && !hasSuiteSettingsErrors;
  const isDefineGoalValid = defineGoalSchema.safeParse({
    evaluationGoal,
    generatorModel,
  }).success;
  const selectedGeneratorModelIsAvailable =
    generatorModel?.source !== 'cluster' ||
    (inferenceServicesLoaded &&
      !inferenceServicesError &&
      inferenceServices.some(
        (service) =>
          service.name === generatorModel.name &&
          getGeneratorModelEndpoint(service) === generatorModel.url,
      ));
  const hasDefineGoalErrors = defineGoalFieldNames.some((fieldName) => defineGoalErrors[fieldName]);
  const canRecommend =
    canContinueSettings &&
    isDefineGoalValid &&
    selectedGeneratorModelIsAvailable &&
    !hasDefineGoalErrors;
  const cancelRoute = evaluationCreateSuiteChooserRoute(namespace);
  // Serialize generation inputs so changes can mark recommendations stale against the submitted snapshot.
  const currentRequestFingerprint = JSON.stringify({
    evaluationGoal: evaluationGoal.trim(),
    model: generatorModel
      ? {
          name: generatorModel.name,
          url: generatorModel.url,
          auth: generatorModel.auth?.secret_ref
            ? { secret_ref: generatorModel.auth.secret_ref }
            : undefined,
        }
      : undefined,
    maxBenchmarks,
    strictness,
    generationEffort,
  });
  const isGenerationStale =
    Boolean(generationId) &&
    Boolean(submittedRequestFingerprint) &&
    submittedRequestFingerprint !== currentRequestFingerprint;

  React.useEffect(() => {
    const resource = generation;
    const completedResource = resource?.status.state === 'completed' ? resource : undefined;
    const proposal = completedResource?.result;
    if (
      !generationId ||
      !completedResource ||
      !proposal ||
      initializedGenerationId.current === generationId
    ) {
      return;
    }

    const uniqueBenchmarks = new Map<string, CollectionBenchmark>();
    proposal.collection.benchmarks.forEach((benchmark) => {
      const key = `${benchmark.provider_id ?? ''}:${benchmark.id}`;
      if (!uniqueBenchmarks.has(key)) {
        uniqueBenchmarks.set(key, benchmark);
      }
    });
    methods.setValue('selectedBenchmarks', [...uniqueBenchmarks.values()], {
      shouldDirty: true,
      shouldValidate: true,
    });
    initializedGenerationId.current = generationId;
  }, [generationId, generation, methods]);

  const handleRecommend = async (): Promise<boolean> => {
    if (!generatorModel) {
      return false;
    }

    resetMutations();

    try {
      await deleteActiveGeneration();
    } catch {
      return false;
    }

    await clearGeneration();
    setSubmittedRequestFingerprint(undefined);
    initializedGenerationId.current = undefined;
    methods.setValue('selectedBenchmarks', [], { shouldDirty: true, shouldValidate: true });

    const request: CollectionGenerationRequest = {
      evaluation_goal: evaluationGoal.trim(),
      model: {
        name: generatorModel.name,
        url: generatorModel.url,
        ...(generatorModel.auth?.secret_ref
          ? { auth: { secret_ref: generatorModel.auth.secret_ref } }
          : {}),
      },
      max_benchmarks: maxBenchmarks,
      ...(strictness ? { strictness } : {}),
      generation_effort: generationEffort,
    };

    try {
      await startGeneration(request);
      setSubmittedRequestFingerprint(currentRequestFingerprint);
      setHasVisitedOverview(true);
      return true;
    } catch {
      return false;
    }
  };

  const handleCancel = async (): Promise<void> => {
    try {
      await deleteActiveGeneration();
    } catch {
      return;
    }
    navigate(cancelRoute);
  };

  const canContinueOverview =
    hasVisitedOverview &&
    generation?.status.state === 'completed' &&
    !isGenerationStale &&
    benchmarkOverviewSchema.safeParse({ selectedBenchmarks }).success;

  const handleStopGeneration = (): void => {
    void stopGeneration().catch(() => {
      // The hook exposes the delete error to the active generation state.
    });
  };

  return (
    <ApplicationsPage
      title="Create collection"
      description="Configure your collection, describe your goal, and choose benchmarks."
      breadcrumb={
        <div className="pf-v6-u-pb-md">
          <ContextBreadcrumb
            pageName="Evaluations"
            projectDisplayName={projectDisplayName}
            homePath={evaluationsBaseRoute(namespace)}
            projectHomePath={projectHomeRoute(namespace)}
          >
            <BreadcrumbItem isActive>Create collection</BreadcrumbItem>
          </ContextBreadcrumb>
        </div>
      }
      loaded
      empty={false}
    >
      <PageSection hasBodyWrapper={false} isFilled>
        <FormProvider {...methods}>
          <Wizard
            className="evalhub-goal-suite-wizard"
            height="100%"
            isVisitRequired
            navAriaLabel="Collection creation steps"
            footer={
              <SuiteBuilderFooter
                canContinueSettings={canContinueSettings}
                canRecommend={canRecommend}
                canContinueOverview={canContinueOverview}
                isStarting={isStarting}
                isBusy={isStarting}
                onCancel={() => void handleCancel()}
              />
            }
          >
            <WizardStep name="Collection settings" id="suite-settings" isDisabled={isStarting}>
              <SuiteSettingsStep canContinueSettings={canContinueSettings} />
            </WizardStep>
            <WizardStep
              name="Define goal"
              id="define-goal"
              isDisabled={!canContinueSettings || isStarting}
            >
              <DefineGoalStep
                inferenceServices={inferenceServices}
                inferenceServicesLoaded={inferenceServicesLoaded}
                inferenceServicesError={inferenceServicesError}
                selectedModelIsAvailable={selectedGeneratorModelIsAvailable}
                canRecommend={canRecommend}
                generationError={createError ?? deleteError}
                onRecommend={handleRecommend}
              />
            </WizardStep>
            <WizardStep
              name="Benchmark overview"
              id="benchmark-overview"
              isDisabled={!canRecommend}
            >
              <CollectionGenerationStep
                resource={generation}
                isLoading={isGenerationLoading}
                isStarting={isStarting}
                isStopping={isStopping}
                isStale={isGenerationStale}
                namespace={namespace ?? ''}
                error={createError ?? deleteError}
                pollError={pollError}
                selectedBenchmarks={selectedBenchmarks}
                onSelectedBenchmarksChange={(benchmarks) =>
                  methods.setValue('selectedBenchmarks', benchmarks, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                onRetry={() => void handleRecommend()}
                onRetryPoll={() => void retryPoll()}
                onStop={handleStopGeneration}
              />
            </WizardStep>
            <WizardStep name="Review" id="review" isDisabled={!canContinueOverview}>
              <div data-testid="review-step-placeholder" />
            </WizardStep>
          </Wizard>
        </FormProvider>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CreateSuiteFromGoalPage;
/* eslint-enable camelcase */
