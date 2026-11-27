import * as React from 'react';
import { FormProvider } from 'react-hook-form';
import {
  BreadcrumbItem,
  Bullseye,
  Button,
  Content,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  PageSection,
  Spinner,
  Title,
  useWizardContext,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getCollection } from '~/app/api/k8s';
import {
  evaluationBenchmarkSuitesNavigationState,
  evaluationBenchmarkSuitesRoute,
  evaluationCuratedBenchmarkSuitesRoute,
  evaluationEvaluateNavigationState,
  evaluationEvaluateRoute,
  evaluationGalleryRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import { useProviders } from '~/app/hooks/useProviders';
import { useCanCreateCollections } from '~/app/hooks/collections';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import {
  CURATED_SUITE_PAGE_CONFIG,
  getCuratedCollectionConfig,
  isCuratedEvaluationTarget,
  type CuratedEvaluationTarget,
} from '~/app/curatedSuiteConfig';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import CopySuiteBenchmarkSelectionStep from '~/app/components/CopySuiteBenchmarkSelectionStep';
import CopySuiteBenchmarksStep from '~/app/pages/CopySuiteBenchmarksStep';
import CopySuiteSettingsStep from '~/app/pages/CopySuiteSettingsStep';
import CollectionReviewStep from '~/app/components/collectionBuilder/CollectionReviewStep';
import CollectionWizard, {
  type CollectionWizardAction,
  type CollectionWizardStep,
} from '~/app/components/collectionBuilder/CollectionWizard';
import type { Collection } from '~/app/types';
import { MAX_COLLECTION_BENCHMARKS } from './const';
import { useCopySuiteForm } from './useCopySuiteForm';

import './ManualCollectionEditorPage.scss';

type ManualCollectionEditorMode = 'create' | 'copy' | 'edit';

type WizardContext = ReturnType<typeof useWizardContext>;

type WizardContextCaptureProps = {
  children: (context: WizardContext) => React.ReactNode;
};

const WizardContextCapture: React.FC<WizardContextCaptureProps> = ({ children }) => {
  const context = useWizardContext();
  return children(context);
};

type ManualCollectionEditorPageProps = {
  mode: ManualCollectionEditorMode;
};

const ManualCollectionEditorPage: React.FC<ManualCollectionEditorPageProps> = ({ mode }) => {
  const isCreateMode = mode === 'create';
  const isEditMode = mode === 'edit';
  const { namespace, collectionId } = useParams<{
    namespace: string;
    collectionId: string;
  }>();
  const createAccessQuery = useCanCreateCollections(isEditMode ? '' : (namespace ?? ''));
  const canCreateCollection =
    isEditMode || (createAccessQuery.data === true && !createAccessQuery.isError);
  const location = useLocation();
  const navigate = useNavigate();
  const projectDisplayName = useProjectDisplayName(namespace);

  const [isRunModalOpen, setIsRunModalOpen] = React.useState(false);
  const [isClonePending, setIsClonePending] = React.useState(false);

  const fetchCollection = React.useCallback<FetchStateCallbackPromise<Collection>>(
    (opts) => {
      if (isCreateMode) {
        return Promise.resolve({ resource: { id: '' }, name: '' });
      }
      if (!namespace || !collectionId) {
        return Promise.reject(new NotReadyError('Missing namespace or collection ID'));
      }
      return getCollection('', namespace, collectionId)(opts);
    },
    [isCreateMode, namespace, collectionId],
  );

  const [fetchedCollection, loaded, loadError] = useFetchState<Collection | undefined>(
    fetchCollection,
    undefined,
    { initialPromisePurity: true },
  );
  const sourceCollection = isCreateMode ? undefined : fetchedCollection;
  const curatedCollectionConfig =
    mode === 'copy' && sourceCollection && !sourceCollection.resource.tenant
      ? getCuratedCollectionConfig(sourceCollection)
      : undefined;
  const prerequisite = curatedCollectionConfig?.prerequisites.map((part) => part.long).join(' ');

  const navigationState = location.state;
  const isEvaluateOrigin =
    navigationState &&
    typeof navigationState === 'object' &&
    'source' in navigationState &&
    navigationState.source === evaluationEvaluateNavigationState.source;
  const isGalleryOrigin =
    navigationState &&
    typeof navigationState === 'object' &&
    'source' in navigationState &&
    navigationState.source === 'gallery';
  const isBenchmarkSuitesOrigin =
    navigationState &&
    typeof navigationState === 'object' &&
    'source' in navigationState &&
    navigationState.source === evaluationBenchmarkSuitesNavigationState.source;
  const navigationEvaluationTarget =
    navigationState &&
    typeof navigationState === 'object' &&
    'sourceEvaluationTarget' in navigationState &&
    typeof navigationState.sourceEvaluationTarget === 'string' &&
    isCuratedEvaluationTarget(navigationState.sourceEvaluationTarget)
      ? navigationState.sourceEvaluationTarget
      : undefined;
  const hasExplicitOrigin =
    isEvaluateOrigin ||
    isGalleryOrigin ||
    isBenchmarkSuitesOrigin ||
    navigationEvaluationTarget !== undefined;
  const sourceEvaluationTarget: CuratedEvaluationTarget | undefined = hasExplicitOrigin
    ? navigationEvaluationTarget
    : [sourceCollection?.evaluation_targets?.[0]].find(isCuratedEvaluationTarget);
  const cancelRoute = isGalleryOrigin
    ? evaluationGalleryRoute(namespace)
    : isBenchmarkSuitesOrigin
      ? evaluationBenchmarkSuitesRoute(namespace)
      : sourceEvaluationTarget
        ? evaluationCuratedBenchmarkSuitesRoute(namespace, sourceEvaluationTarget)
        : evaluationEvaluateRoute(namespace);

  const {
    providers,
    loaded: providersLoaded,
    loadError: providersLoadError,
  } = useProviders(namespace ?? '');

  const form = useCopySuiteForm({
    namespace,
    sourceCollection,
    providers,
    providersLoaded,
    mode,
    onSaveAndRunRequest: () => setIsRunModalOpen(true),
    cancelRoute,
  });
  const isPageInteractionDisabled = isClonePending || form.isSubmitting;

  const pendingCollection =
    isCreateMode || sourceCollection ? form.buildPendingCollection() : undefined;
  const isSelectionValid =
    form.isSettingsValid &&
    form.benchmarks.length > 0 &&
    form.benchmarks.length <= MAX_COLLECTION_BENCHMARKS;
  const isReviewValid = form.isValid && Boolean(pendingCollection);
  const handleSaveAndRun = (): void => {
    if (canCreateCollection && isReviewValid) {
      form.handleSaveAndRun();
    }
  };
  const handleSaveOnly = (): void => {
    if (canCreateCollection && isReviewValid) {
      void form.handleSaveOnly();
    }
  };

  const renderBreadcrumbLink = React.useCallback(
    (to: string, label: React.ReactNode, testId: string) => {
      if (isPageInteractionDisabled) {
        return (
          <span
            aria-disabled="true"
            className="evalhub-copy-suite-page__breadcrumb-link-disabled"
            data-testid={testId}
          >
            {label}
          </span>
        );
      }

      return (
        <Link to={to} data-testid={testId}>
          {label}
        </Link>
      );
    },
    [isPageInteractionDisabled],
  );

  if (
    loadError ||
    providersLoadError ||
    (!isCreateMode && loaded && providersLoaded && !sourceCollection)
  ) {
    return (
      <Bullseye>
        <EmptyState
          headingLevel="h2"
          icon={ExclamationCircleIcon}
          titleText="Unable to load collection"
          status="danger"
          data-testid="copy-suite-load-error"
        >
          <EmptyStateBody>
            {loadError?.message ??
              providersLoadError?.message ??
              'The requested collection could not be found.'}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button variant="primary" component={(props) => <Link {...props} to={cancelRoute} />}>
                Return to evaluations
              </Button>
            </EmptyStateActions>
          </EmptyStateFooter>
        </EmptyState>
      </Bullseye>
    );
  }

  if ((!isCreateMode && !loaded) || !providersLoaded) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading collection" />
      </Bullseye>
    );
  }

  const curatedSuitePage = sourceEvaluationTarget
    ? CURATED_SUITE_PAGE_CONFIG[sourceEvaluationTarget]
    : undefined;
  const pageTitle = isCreateMode
    ? 'Create collection'
    : isEditMode
      ? 'Edit collection'
      : 'Copy collection';
  const pageDescription =
    'Configure your collection, select benchmarks, and review their settings.';
  const breadcrumbItems: React.ReactElement[] = [];

  if (isGalleryOrigin) {
    breadcrumbItems.push(
      <BreadcrumbItem
        key="gallery"
        render={() =>
          renderBreadcrumbLink(
            evaluationGalleryRoute(namespace),
            'Gallery',
            'copy-suite-breadcrumb-gallery',
          )
        }
      />,
    );
  } else if (isBenchmarkSuitesOrigin) {
    breadcrumbItems.push(
      <BreadcrumbItem
        key="benchmarkSuites"
        render={() =>
          renderBreadcrumbLink(
            evaluationEvaluateRoute(namespace),
            'Benchmark collections',
            'copy-suite-breadcrumb-benchmark-suites',
          )
        }
      />,
      <BreadcrumbItem
        key="myBenchmarkSuites"
        render={() =>
          renderBreadcrumbLink(
            evaluationBenchmarkSuitesRoute(namespace),
            'My benchmark collections',
            'copy-suite-breadcrumb-my-benchmark-suites',
          )
        }
      />,
    );
  } else if (curatedSuitePage && sourceEvaluationTarget) {
    breadcrumbItems.push(
      <BreadcrumbItem
        key="curatedSuites"
        render={() =>
          renderBreadcrumbLink(
            evaluationCuratedBenchmarkSuitesRoute(namespace, sourceEvaluationTarget),
            curatedSuitePage.title,
            'copy-suite-breadcrumb-curated-suites',
          )
        }
      />,
    );
  } else if (!isCreateMode || isEvaluateOrigin) {
    breadcrumbItems.push(
      <BreadcrumbItem
        key="benchmarkSuites"
        render={() =>
          renderBreadcrumbLink(
            evaluationEvaluateRoute(namespace),
            'Benchmark collections',
            'copy-suite-breadcrumb-benchmark-suites',
          )
        }
      />,
    );
  }

  breadcrumbItems.push(
    <BreadcrumbItem key="collection-action" isActive>
      {pageTitle}
    </BreadcrumbItem>,
  );

  const cancelAction = (dataTestId: string): CollectionWizardAction => ({
    label: 'Cancel',
    variant: 'link',
    onClick: form.handleCancel,
    dataTestId,
  });
  const steps: CollectionWizardStep[] = [
    {
      name: 'Collection settings',
      id: 'settings',
      canEnter: !isPageInteractionDisabled,
      content: <CopySuiteSettingsStep prerequisite={prerequisite} />,
      actions: [
        {
          label: 'Next',
          variant: 'primary',
          navigation: 'next',
          dataTestId: 'copy-suite-next',
        },
        cancelAction('copy-suite-cancel'),
      ],
    },
    {
      name: 'Benchmarks',
      id: 'selectBenchmarks',
      canEnter: form.isSettingsValid && !isPageInteractionDisabled,
      content: (
        <CopySuiteBenchmarkSelectionStep
          providers={providers}
          selectedBenchmarkKeys={form.selectedBenchmarkKeys}
          collectionCategories={form.suiteDomains}
          prefilterProviders={!isCreateMode}
          isInteractionDisabled={isPageInteractionDisabled}
          onSelectionChange={form.applyBenchmarkSelection}
        />
      ),
      actions: [
        {
          label: 'Back',
          variant: 'secondary',
          navigation: 'previous',
          dataTestId: 'copy-suite-back-select-benchmarks',
        },
        {
          label: 'Next',
          variant: 'primary',
          navigation: 'next',
          dataTestId: 'copy-suite-next-select-benchmarks',
        },
        cancelAction('copy-suite-cancel-select-benchmarks'),
      ],
    },
    {
      name: 'Benchmark settings',
      id: 'benchmarks',
      canEnter: isSelectionValid && !isPageInteractionDisabled,
      content: (
        <WizardContextCapture>
          {({ goToPrevStep }) => (
            <CopySuiteBenchmarksStep
              benchmarks={form.benchmarks}
              providers={providers}
              showWeightEdit={form.benchmarks.length > 1}
              weightSegments={form.weightSegments}
              minWeightPercent={form.minWeightPercent}
              isInteractionDisabled={isPageInteractionDisabled}
              parameterConfig={curatedCollectionConfig?.parameters}
              onUpdateBenchmark={form.updateBenchmark}
              onWeightsChange={form.handleWeightsChange}
              onBack={goToPrevStep}
            />
          )}
        </WizardContextCapture>
      ),
      actions: [
        {
          label: 'Back',
          variant: 'secondary',
          navigation: 'previous',
          dataTestId: 'copy-suite-back-step-2',
        },
        {
          label: 'Next',
          variant: 'primary',
          navigation: 'next',
          dataTestId: 'copy-suite-next-review',
        },
        cancelAction('copy-suite-cancel-step-2'),
      ],
    },
    {
      name: 'Review',
      id: 'review',
      canEnter: isReviewValid && !isPageInteractionDisabled,
      content: pendingCollection ? (
        <CollectionReviewStep collection={pendingCollection} providers={providers} />
      ) : null,
      actions: [
        {
          label: 'Back',
          variant: 'secondary',
          navigation: 'previous',
          dataTestId: 'copy-suite-back-review',
        },
        {
          label: 'Save and run',
          variant: 'primary',
          onClick: handleSaveAndRun,
          isDisabled: !isReviewValid || !canCreateCollection,
          isLoading: form.isSubmitting,
          dataTestId:
            mode === 'create'
              ? 'create-suite-submit'
              : isEditMode
                ? 'edit-suite-save-and-run'
                : 'copy-suite-save-and-run',
        },
        {
          label: isEditMode ? 'Save changes' : 'Add to my collections',
          variant: 'secondary',
          onClick: handleSaveOnly,
          isDisabled: !isReviewValid || !canCreateCollection,
          dataTestId: 'copy-suite-save-only',
        },
        cancelAction('copy-suite-cancel-step-2'),
      ],
    },
  ];

  return (
    <div className="evalhub-copy-suite-page">
      <ApplicationsPage
        noHeader
        breadcrumb={
          <ContextBreadcrumb
            pageName="Evaluations"
            projectDisplayName={projectDisplayName}
            homePath={evaluationsBaseRoute(namespace)}
            projectHomePath={projectHomeRoute(namespace)}
            isHomeDisabled={isPageInteractionDisabled}
            isProjectLinkDisabled={isPageInteractionDisabled}
            homeTestId="copy-suite-breadcrumb-evaluations"
          >
            {breadcrumbItems}
          </ContextBreadcrumb>
        }
        loaded
        empty={false}
      >
        <PageSection
          id="copy-suite-page-header"
          hasBodyWrapper={false}
          isFilled
          className="evalhub-copy-suite-page__section"
        >
          <FormProvider {...form.form}>
            <div
              id="copy-suite-editor"
              className="evalhub-copy-suite-page__editor"
              data-testid="copy-suite-editor"
            >
              <Title
                headingLevel="h1"
                size="2xl"
                data-testid="app-page-title"
                className="pf-v6-u-mt-0 pf-v6-u-mb-0"
              >
                {pageTitle}
              </Title>
              <Content component="p" data-testid="copy-suite-description" className="pf-v6-u-mb-lg">
                {pageDescription}
              </Content>
              <CollectionWizard
                steps={steps}
                isBusy={isPageInteractionDisabled}
                navAriaLabel="Collection creation steps"
                className="evalhub-copy-suite-page__wizard"
                footerClassName="evalhub-copy-suite-page__wizard-footer"
              />
            </div>
          </FormProvider>
          {isRunModalOpen && (isCreateMode || pendingCollection) ? (
            <StartEvaluationRunModal
              isOpen={isRunModalOpen}
              onClose={() => setIsRunModalOpen(false)}
              namespace={namespace}
              collection={pendingCollection}
              isCollectionFlow
              defaultEvaluationName={form.suiteName}
              modalId={
                isCreateMode
                  ? 'create-suite-run-evaluation-modal'
                  : isEditMode
                    ? 'edit-suite-run-evaluation-modal'
                    : 'copy-suite-run-evaluation-modal'
              }
              resolveCollection={
                isCreateMode ? form.createCollectionForRun : form.cloneCollectionForRun
              }
              onClonePendingChange={setIsClonePending}
              trackingSource={
                isCreateMode ? 'create_suite' : isEditMode ? 'edit_suite' : 'copy_suite'
              }
              onSuccess={() => {
                setIsRunModalOpen(false);
                navigate({ pathname: evaluationsBaseRoute(namespace), search: '?tab=runs' });
              }}
            />
          ) : null}
        </PageSection>
      </ApplicationsPage>
    </div>
  );
};

export default ManualCollectionEditorPage;
