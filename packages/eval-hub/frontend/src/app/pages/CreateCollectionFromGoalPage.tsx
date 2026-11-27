/* eslint-disable camelcase */
import * as React from 'react';
import { BreadcrumbItem, PageSection } from '@patternfly/react-core';
import { MagicIcon } from '@patternfly/react-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, useFormState, useWatch } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { createCollection } from '~/app/api/k8s';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import CollectionGenerationStep from '~/app/components/collectionBuilder/CollectionGenerationStep';
import DefineGoalStep from '~/app/components/collectionBuilder/DefineGoalStep';
import CollectionReviewStep from '~/app/components/collectionBuilder/CollectionReviewStep';
import CollectionWizard, {
  type CollectionWizardAction,
  type CollectionWizardStep,
} from '~/app/components/collectionBuilder/CollectionWizard';
import CollectionSettingsStep from '~/app/components/collectionBuilder/CollectionSettingsStep';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import { useCollectionsContext } from '~/app/context/CollectionsContext';
import useCollectionGeneration from '~/app/hooks/useCollectionGeneration';
import { useCanCreateCollections } from '~/app/hooks/collections';
import { useNotification } from '~/app/hooks/useNotification';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useInferenceServices } from '~/app/hooks/useInferenceServices';
import { useProviders } from '~/app/hooks/useProviders';
import { getGeneratorModelEndpoint } from '~/app/utils/generatorModelUtils';
import {
  evaluationCreateSuiteChooserRoute,
  evaluationBenchmarkSuitesRoute,
  evaluationRunsRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import {
  collectionBuilderDefaultValues,
  collectionBuilderSchema,
  defineGoalFieldNames,
  defineGoalSchema,
  collectionSettingsFieldNames,
  collectionGenerationSettingsSchema,
  benchmarkOverviewSchema,
  type CollectionBuilderFormValues,
} from '~/app/schemas/collectionBuilder.schema';
import type { Collection, CollectionBenchmark, CollectionGenerationRequest } from '~/app/types';
import {
  buildGoalCollectionCreateRequest,
  enrichCollectionBenchmark,
} from '~/app/utilities/goalCollectionUtils';

import './CreateCollectionFromGoalPage.scss';

type GoalCollectionPageContentProps = {
  namespace?: string;
};

const GoalCollectionPageContent: React.FC<GoalCollectionPageContentProps> = ({ namespace }) => {
  const navigate = useNavigate();
  const projectDisplayName = useProjectDisplayName(namespace);
  const createAccessQuery = useCanCreateCollections(namespace ?? '');
  const canCreateCollection = createAccessQuery.data === true && !createAccessQuery.isError;
  const notification = useNotification();
  const { refresh: refreshCollections } = useCollectionsContext();
  const {
    generationId,
    generation,
    isLoading: isGenerationLoading,
    isStarting,
    createError,
    deleteError,
    pollError,
    startGeneration,
    deleteGeneration,
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
  const {
    providers,
    loaded: providersLoaded,
    loadError: providersError,
  } = useProviders(namespace ?? '');
  const [submittedRequestFingerprint, setSubmittedRequestFingerprint] = React.useState<string>();
  const [isRunModalOpen, setIsRunModalOpen] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isRunPending, setIsRunPending] = React.useState(false);
  const saveInFlightRef = React.useRef(false);
  const savedCollectionRef = React.useRef<{ fingerprint: string; collection: Collection }>();
  const initializedGenerationId = React.useRef<string>();
  const isMountedRef = React.useRef(false);
  const currentNamespaceRef = React.useRef(namespace);
  currentNamespaceRef.current = namespace;
  React.useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);
  const methods = useForm<CollectionBuilderFormValues>({
    defaultValues: collectionBuilderDefaultValues,
    resolver: zodResolver(collectionBuilderSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    shouldUnregister: false,
  });
  const [suiteName, suiteDescription, maxBenchmarks] = useWatch({
    control: methods.control,
    name: [...collectionSettingsFieldNames],
  });
  const evaluationGoal = useWatch({ control: methods.control, name: 'evaluationGoal' });
  const generatorModel = useWatch({ control: methods.control, name: 'generatorModel' });
  const strictness = useWatch({ control: methods.control, name: 'strictness' });
  const generationEffort = useWatch({ control: methods.control, name: 'generationEffort' });
  const frameworkFilter = useWatch({ control: methods.control, name: 'frameworkFilter' });
  const selectedBenchmarks = useWatch({ control: methods.control, name: 'selectedBenchmarks' });
  const { errors: collectionSettingsErrors } = useFormState({
    control: methods.control,
    name: [...collectionSettingsFieldNames],
  });
  const { errors: defineGoalErrors } = useFormState({
    control: methods.control,
    name: [...defineGoalFieldNames],
  });
  const isCollectionSettingsValid = collectionGenerationSettingsSchema.safeParse({
    suiteName,
    suiteDescription,
    maxBenchmarks,
    generatorModel,
    strictness,
    generationEffort,
    frameworkFilter,
  }).success;
  const hasSuiteSettingsErrors = collectionSettingsFieldNames.some(
    (fieldName) => collectionSettingsErrors[fieldName],
  );
  const selectedGeneratorModelIsAvailable =
    generatorModel?.source !== 'cluster' ||
    (inferenceServicesLoaded &&
      !inferenceServicesError &&
      inferenceServices.some(
        (service) =>
          service.name === generatorModel.name &&
          getGeneratorModelEndpoint(service) === generatorModel.url,
      ));
  const canContinueSettings =
    isCollectionSettingsValid && selectedGeneratorModelIsAvailable && !hasSuiteSettingsErrors;
  const isDefineGoalValid = defineGoalSchema.safeParse({
    evaluationGoal,
  }).success;
  const hasDefineGoalErrors = defineGoalFieldNames.some((fieldName) => defineGoalErrors[fieldName]);
  const canRecommend = canContinueSettings && isDefineGoalValid && !hasDefineGoalErrors;
  const cancelRoute = evaluationCreateSuiteChooserRoute(namespace);
  const selectedProviderIds = [...new Set(frameworkFilter)].toSorted();
  const model = generatorModel
    ? generatorModel.source === 'external'
      ? {
          name: generatorModel.name.trim(),
          url: generatorModel.url.trim(),
          ...(generatorModel.auth?.secret_ref?.trim()
            ? { auth: { secret_ref: generatorModel.auth.secret_ref.trim() } }
            : {}),
        }
      : { name: generatorModel.name, url: generatorModel.url }
    : undefined;
  const generationRequest: CollectionGenerationRequest | undefined = model
    ? {
        evaluation_goal: evaluationGoal.trim(),
        model,
        max_benchmarks: maxBenchmarks,
        strictness,
        generation_effort: generationEffort,
        ...(selectedProviderIds.length > 0
          ? { provider_filter: selectedProviderIds.join(',') }
          : {}),
      }
    : undefined;
  // Compare the exact submitted payload with current inputs to detect stale recommendations.
  const currentRequestFingerprint = generationRequest
    ? JSON.stringify(generationRequest)
    : undefined;
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

    if (!providersLoaded && !providersError) {
      return;
    }
    const uniqueBenchmarks = new Map<string, CollectionBenchmark>();
    proposal.collection.benchmarks.forEach((benchmark) => {
      const key = `${benchmark.provider_id ?? ''}:${benchmark.id}`;
      if (!uniqueBenchmarks.has(key)) {
        uniqueBenchmarks.set(key, enrichCollectionBenchmark(benchmark, providers));
      }
    });
    methods.setValue('selectedBenchmarks', [...uniqueBenchmarks.values()], {
      shouldDirty: true,
      shouldValidate: true,
    });
    initializedGenerationId.current = generationId;
  }, [generationId, generation, methods, providers, providersLoaded, providersError]);

  React.useEffect(() => {
    if (generation?.status.state === 'failed') {
      void deleteGeneration().catch(() => {
        // Keep the failed resource visible so the user can retry cleanup or generation.
      });
    }
  }, [deleteGeneration, generation?.status.state, generationId]);

  const handleRecommend = async (): Promise<boolean> => {
    if (!generationRequest || !canRecommend) {
      return false;
    }

    try {
      await deleteGeneration();
    } catch {
      return false;
    }

    await clearGeneration();
    resetMutations();
    setSubmittedRequestFingerprint(undefined);
    initializedGenerationId.current = undefined;
    methods.setValue('selectedBenchmarks', [], { shouldDirty: true, shouldValidate: true });

    try {
      await startGeneration(generationRequest);
      setSubmittedRequestFingerprint(currentRequestFingerprint);
      return true;
    } catch {
      return false;
    }
  };

  const handleCancel = async (): Promise<void> => {
    try {
      await deleteGeneration();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      notification.error('Could not delete recommendation job', message);
      return;
    }
    navigate(cancelRoute);
  };

  const canContinueOverview =
    generation?.status.state === 'completed' &&
    !isGenerationStale &&
    benchmarkOverviewSchema.safeParse({ selectedBenchmarks }).success;

  const generatedCollection =
    generation?.status.state === 'completed' && generation.result
      ? generation.result.collection
      : undefined;
  const canSave =
    Boolean(namespace && generatedCollection) &&
    isCollectionSettingsValid &&
    !hasSuiteSettingsErrors &&
    isDefineGoalValid &&
    !hasDefineGoalErrors &&
    canContinueOverview;
  const buildRequest = (): ReturnType<typeof buildGoalCollectionCreateRequest> | undefined => {
    if (!generatedCollection) {
      return undefined;
    }
    return buildGoalCollectionCreateRequest(
      generatedCollection,
      suiteName,
      suiteDescription,
      selectedBenchmarks,
    );
  };

  const handleSaveAndRun = (): void => {
    if (canSave && canCreateCollection && !saveInFlightRef.current) {
      setIsRunModalOpen(true);
    }
  };

  const createReviewedCollection = async (
    signal?: AbortSignal,
  ): Promise<Collection | undefined> => {
    if (
      !canSave ||
      !canCreateCollection ||
      !namespace ||
      signal?.aborted ||
      saveInFlightRef.current
    ) {
      return undefined;
    }
    saveInFlightRef.current = true;
    setIsSaving(true);
    try {
      if (!(await methods.trigger()) || signal?.aborted) {
        return undefined;
      }
      const request = buildRequest();
      if (!request) {
        return undefined;
      }
      const fingerprint = JSON.stringify({ namespace, generationId, request });
      if (savedCollectionRef.current?.fingerprint === fingerprint) {
        return savedCollectionRef.current.collection;
      }
      const collection = await createCollection('', namespace, request)({ signal });
      savedCollectionRef.current = { fingerprint, collection };
      try {
        await deleteGeneration();
      } catch (cleanupError) {
        const message =
          cleanupError instanceof Error ? cleanupError.message : 'An unknown error occurred.';
        notification.error('Collection created, but recommendation cleanup failed', message);
      }
      if (signal?.aborted) {
        return undefined;
      }
      refreshCollections();
      return collection;
    } catch (error) {
      if (!signal?.aborted) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred.';
        notification.error('Failed to create collection', message);
      }
      return undefined;
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    const saveNamespace = namespace;
    const collection = await createReviewedCollection();
    if (!collection) {
      return;
    }
    notification.success(
      'Collection created',
      `"${collection.name}" has been added to your collections.`,
    );
    if (isMountedRef.current && currentNamespaceRef.current === saveNamespace && saveNamespace) {
      navigate(evaluationBenchmarkSuitesRoute(saveNamespace));
    }
  };

  const handleLeaveGeneration = async (): Promise<void> => {
    if (generation?.status.state === 'pending' || generation?.status.state === 'running') {
      await stopGeneration();
      return;
    }
    await deleteGeneration();
  };

  const cancelAction: CollectionWizardAction = {
    label: 'Cancel',
    variant: 'link',
    onClick: () => void handleCancel(),
    dataTestId: 'suite-builder-cancel',
  };
  const backAction: CollectionWizardAction = {
    label: 'Back',
    variant: 'secondary',
    navigation: 'previous',
    dataTestId: 'suite-builder-back',
  };
  const steps: CollectionWizardStep[] = [
    {
      name: 'Collection settings',
      id: 'suite-settings',
      canEnter: !isStarting,
      actions: [
        {
          label: 'Next',
          variant: 'primary',
          type: 'submit',
          form: 'suite-settings-form',
          requiresNextStep: true,
          dataTestId: 'next-suite-settings',
        },
        cancelAction,
      ],
      content: (
        <CollectionSettingsStep
          canContinueSettings={canContinueSettings}
          inferenceServices={inferenceServices}
          inferenceServicesLoaded={inferenceServicesLoaded}
          inferenceServicesError={inferenceServicesError}
          selectedModelIsAvailable={selectedGeneratorModelIsAvailable}
          providers={providers}
          providersLoaded={providersLoaded}
          providersError={providersError}
        />
      ),
    },
    {
      name: 'Define goal',
      id: 'define-goal',
      canEnter: (canContinueSettings || Boolean(generationId)) && !isStarting,
      actions: [
        {
          label: isStarting ? 'Starting recommendations…' : 'Recommend benchmarks with AI',
          variant: 'primary',
          type: 'submit',
          form: 'define-goal-form',
          icon: <MagicIcon aria-hidden />,
          requiresNextStep: true,
          dataTestId: 'recommend-benchmarks-with-ai',
        },
        backAction,
        cancelAction,
      ],
      content: (
        <DefineGoalStep
          canRecommend={canRecommend}
          generationError={createError ?? deleteError}
          onRecommend={handleRecommend}
        />
      ),
    },
    {
      name: 'Benchmark overview',
      id: 'benchmark-overview',
      canEnter: canRecommend || Boolean(generationId),
      actions: [
        backAction,
        {
          label: 'Next',
          variant: 'primary',
          navigation: 'next',
          dataTestId: 'next-benchmark-overview',
        },
        cancelAction,
      ],
      content: (
        <CollectionGenerationStep
          resource={generation}
          isLoading={isGenerationLoading}
          isStarting={isStarting}
          isStale={isGenerationStale}
          providers={providers}
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
        />
      ),
    },
    {
      name: 'Review',
      id: 'review',
      canEnter: canSave,
      actions: [
        backAction,
        {
          label: 'Save and run',
          variant: 'primary',
          onClick: handleSaveAndRun,
          isDisabled: !canSave || !canCreateCollection,
          dataTestId: 'goal-suite-save-and-run',
        },
        {
          label: isSaving ? 'Saving…' : 'Save',
          variant: 'secondary',
          onClick: () => void handleSave(),
          isDisabled: !canSave || !canCreateCollection,
          dataTestId: 'goal-suite-save',
        },
        cancelAction,
      ],
      content: generatedCollection ? (
        <CollectionReviewStep
          collection={{
            ...generatedCollection,
            name: suiteName,
            description: suiteDescription,
            benchmarks: selectedBenchmarks,
          }}
          providers={providers}
          generationSettings={{
            generatorModel,
            strictness,
            generationEffort,
            frameworkFilter,
          }}
        />
      ) : null,
    },
  ];
  return (
    <div className="evalhub-goal-collection-page">
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
        <PageSection
          className="evalhub-goal-collection-page__section"
          hasBodyWrapper={false}
          isFilled
        >
          <FormProvider {...methods}>
            <CollectionWizard
              steps={steps}
              isBusy={isStarting || isSaving || isRunPending}
              isVisitRequired
              navAriaLabel="Collection creation steps"
              className="evalhub-goal-collection-wizard"
              cleanup={{
                fromStepIds: ['benchmark-overview', 'review'],
                toStepIds: ['suite-settings', 'define-goal'],
                onLeave: handleLeaveGeneration,
              }}
            />
          </FormProvider>
          {isRunModalOpen ? (
            <StartEvaluationRunModal
              isOpen={isRunModalOpen}
              onClose={() => setIsRunModalOpen(false)}
              namespace={namespace}
              isCollectionFlow
              defaultEvaluationName={suiteName}
              modalId="goal-suite-run-evaluation-modal"
              resolveCollection={createReviewedCollection}
              onClonePendingChange={setIsRunPending}
              trackingSource="create_suite"
              onSuccess={() => {
                setIsRunModalOpen(false);
                navigate(evaluationRunsRoute(namespace));
              }}
            />
          ) : null}
        </PageSection>
      </ApplicationsPage>
    </div>
  );
};

const CreateCollectionFromGoalPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  // A project switch unmounts the old form so a late generation POST is cleaned up in its original namespace.
  return <GoalCollectionPageContent key={namespace} namespace={namespace} />;
};

export default CreateCollectionFromGoalPage;
/* eslint-enable camelcase */
