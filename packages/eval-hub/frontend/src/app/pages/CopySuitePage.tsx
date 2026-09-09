import * as React from 'react';
import { FormProvider } from 'react-hook-form';
import {
  Breadcrumb,
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
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useNavigate, useParams } from 'react-router';
import { useFetchState, FetchStateCallbackPromise, NotReadyError } from 'mod-arch-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import { getCollection } from '~/app/api/k8s';
import { evaluationsBaseRoute, evaluationCollectionsRoute } from '~/app/routes';
import { useProviders } from '~/app/hooks/useProviders';
import { formatCategory } from '~/app/components/benchmarkUtils';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import CopySuiteBenchmarksStep from '~/app/pages/CopySuiteBenchmarksStep';
import CopySuiteSettingsStep from '~/app/pages/CopySuiteSettingsStep';
import { suiteEvaluatesToSourceMode } from '~/app/utilities/startEvaluationRunUtils';
import type { Collection } from '~/app/types';
import { useCopySuiteForm } from './useCopySuiteForm';

import './CopySuitePage.scss';

type CopySuiteStep = 'settings' | 'benchmarks';

const CopySuitePage: React.FC = () => {
  const { namespace, collectionId } = useParams<{
    namespace: string;
    collectionId: string;
  }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = React.useState<CopySuiteStep>('settings');
  const [isRunModalOpen, setIsRunModalOpen] = React.useState(false);
  const [isClonePending, setIsClonePending] = React.useState(false);

  const fetchCollection = React.useCallback<FetchStateCallbackPromise<Collection>>(
    (opts) => {
      if (!namespace || !collectionId) {
        return Promise.reject(new NotReadyError('Missing namespace or collection ID'));
      }
      return getCollection('', namespace, collectionId)(opts);
    },
    [namespace, collectionId],
  );

  const [sourceCollection, loaded, loadError] = useFetchState<Collection | undefined>(
    fetchCollection,
    undefined,
    { initialPromisePurity: true },
  );

  const { providers, loaded: providersLoaded } = useProviders(namespace ?? '');

  const form = useCopySuiteForm({
    namespace,
    sourceCollection,
    providers,
    providersLoaded,
    onSaveAndRunRequest: () => setIsRunModalOpen(true),
  });
  const isPageInteractionDisabled = isClonePending || form.isSubmitting;

  const pendingCollection = form.buildPendingCollection();

  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    if (sourceCollection?.category) {
      categories.add(sourceCollection.category);
    }
    if (form.suiteCategory && form.suiteCategory !== sourceCollection?.category) {
      categories.add(form.suiteCategory);
    }
    return [...categories];
  }, [sourceCollection, form.suiteCategory]);

  const collectionsBreadcrumbLabel = sourceCollection?.category
    ? `${formatCategory(sourceCollection.category)} benchmark suites`
    : 'Benchmark suites';

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

  if (!loaded || !providersLoaded) {
    return (
      <Bullseye>
        <Spinner aria-label="Loading benchmark suite" />
      </Bullseye>
    );
  }

  if (loadError || !sourceCollection) {
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
            {loadError?.message ?? 'The requested collection could not be found.'}
          </EmptyStateBody>
          <EmptyStateFooter>
            <EmptyStateActions>
              <Button
                variant="primary"
                component={(props) => (
                  <Link {...props} to={evaluationCollectionsRoute(namespace)} />
                )}
              >
                Return to benchmark suites
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
            render={() =>
              renderBreadcrumbLink(
                evaluationsBaseRoute(namespace),
                'Evaluations',
                'copy-suite-breadcrumb-evaluations',
              )
            }
          />
          <BreadcrumbItem
            render={() =>
              renderBreadcrumbLink(
                evaluationCollectionsRoute(namespace),
                collectionsBreadcrumbLabel,
                'copy-suite-breadcrumb-collections',
              )
            }
          />
          {currentStep === 'settings' ? (
            <BreadcrumbItem isActive>Customize benchmark suite</BreadcrumbItem>
          ) : (
            <>
              <BreadcrumbItem
                render={() => (
                  <Button
                    variant="link"
                    isInline
                    className="pf-v6-c-breadcrumb__link"
                    onClick={() => {
                      if (!isPageInteractionDisabled) {
                        setCurrentStep('settings');
                      }
                    }}
                    isDisabled={isPageInteractionDisabled}
                    data-testid="copy-suite-breadcrumb-settings"
                  >
                    Customize benchmark suite
                  </Button>
                )}
              />
              <BreadcrumbItem isActive>Benchmarks</BreadcrumbItem>
            </>
          )}
        </Breadcrumb>
      }
      loaded
      empty={false}
    >
      <PageSection
        id="copy-suite-page-header"
        hasBodyWrapper={false}
        isFilled
        className="evalhub-copy-suite-page"
      >
        <FormProvider {...form.form}>
          <div id="copy-suite-editor" data-testid="copy-suite-editor">
            <Content
              component="h1"
              data-testid="app-page-title"
              className="pf-v6-u-mt-0 pf-v6-u-mb-0"
            >
              Copy suite
            </Content>
            <Content component="p" data-testid="copy-suite-description">
              Customize benchmarks, thresholds, and metrics before adding this suite to your
              dashboard.
            </Content>

            {currentStep === 'settings' ? (
              <CopySuiteSettingsStep
                availableCategories={availableCategories}
                onNext={() => setCurrentStep('benchmarks')}
                onCancel={form.handleCancel}
              />
            ) : (
              <CopySuiteBenchmarksStep
                benchmarks={form.benchmarks}
                selectedBenchmarkKeys={form.selectedBenchmarkKeys}
                providers={providers}
                showWeightEdit={form.benchmarks.length > 1}
                weightSegments={form.weightSegments}
                minWeightPercent={form.minWeightPercent}
                isValid={form.isValid}
                isSubmitting={isPageInteractionDisabled}
                isInteractionDisabled={isPageInteractionDisabled}
                onUpdateBenchmark={form.updateBenchmark}
                onApplyBenchmarkSelection={form.applyBenchmarkSelection}
                onWeightsChange={form.handleWeightsChange}
                onSaveAndRun={form.handleSaveAndRun}
                onSaveOnly={form.handleSaveOnly}
                onCancel={form.handleCancel}
              />
            )}
          </div>
        </FormProvider>
        {isRunModalOpen && pendingCollection ? (
          <StartEvaluationRunModal
            isOpen={isRunModalOpen}
            onClose={() => setIsRunModalOpen(false)}
            namespace={namespace}
            collection={pendingCollection}
            isCollectionFlow
            defaultEvaluationName={form.suiteName}
            defaultSourceMode={suiteEvaluatesToSourceMode(form.suiteEvaluates)}
            modalId="copy-suite-run-evaluation-modal"
            resolveCollection={form.cloneCollectionForRun}
            onClonePendingChange={setIsClonePending}
            trackingSource="copy_suite"
            onSuccess={() => {
              setIsRunModalOpen(false);
              navigate(evaluationsBaseRoute(namespace));
            }}
          />
        ) : null}
      </PageSection>
    </ApplicationsPage>
  );
};

export default CopySuitePage;
