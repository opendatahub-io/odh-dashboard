import * as React from 'react';
import { FormProvider } from 'react-hook-form';
import {
  BreadcrumbItem,
  Bullseye,
  Content,
  PageSection,
  Spinner,
  Title,
} from '@patternfly/react-core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import CopySuiteBenchmarkSelectionStep from '~/app/components/CopySuiteBenchmarkSelectionStep';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import CopySuiteBenchmarksStep from '~/app/pages/CopySuiteBenchmarksStep';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useProviders } from '~/app/hooks/useProviders';
import {
  evaluationEvaluateRoute,
  evaluationGalleryRoute,
  evaluationRunsRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import { useCopySuiteForm, getBenchmarkKey } from '~/app/pages/useCopySuiteForm';
import type { CopySuiteBenchmark } from '~/app/pages/useCopySuiteForm';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';

import './CopySuitePage.scss';

type SingleBenchmarkStep = 'selectBenchmark' | 'configureBenchmark';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getRunAdditionalArgs = (benchmark: CopySuiteBenchmark): string => {
  let args: Record<string, unknown> = {};
  if (benchmark.additionalParameters?.trim()) {
    try {
      const parsed: unknown = JSON.parse(benchmark.additionalParameters);
      if (!isRecord(parsed)) {
        return benchmark.additionalParameters;
      }
      args = parsed;
    } catch {
      return benchmark.additionalParameters;
    }
  }

  benchmark.parameters.forEach((parameter) => {
    if (parameter.value !== undefined) {
      args[parameter.key] = parameter.value;
    }
  });

  return Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : '';
};

const SingleBenchmarkWizardPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const projectDisplayName = useProjectDisplayName(namespace);
  const { providers, loaded, loadError } = useProviders(namespace ?? '');
  const [currentStep, setCurrentStep] = React.useState<SingleBenchmarkStep>('selectBenchmark');
  const [isRunModalOpen, setIsRunModalOpen] = React.useState(false);

  const navigationSource =
    location.state && typeof location.state === 'object' && 'source' in location.state
      ? location.state.source
      : undefined;
  const cancelRoute =
    navigationSource === 'gallery'
      ? evaluationGalleryRoute(namespace)
      : evaluationEvaluateRoute(namespace);

  const form = useCopySuiteForm({
    namespace,
    sourceCollection: undefined,
    providers,
    providersLoaded: loaded,
    mode: 'create',
    singleBenchmarkFlow: true,
    cancelRoute,
    onSaveAndRunRequest: () => setIsRunModalOpen(true),
  });

  const flatBenchmarksByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);
  const configuredBenchmark = form.benchmarks.at(0);
  const selectedBenchmark = configuredBenchmark
    ? flatBenchmarksByKey.get(getBenchmarkKey(configuredBenchmark))
    : undefined;
  const initialRunValues = React.useMemo(() => {
    if (!configuredBenchmark) {
      return undefined;
    }

    const additionalArgs = getRunAdditionalArgs(configuredBenchmark);
    return {
      threshold: configuredBenchmark.threshold,
      primaryMetric: configuredBenchmark.primaryMetric,
      testDataRef: configuredBenchmark.testDataRef,
      additionalArgs,
      showAdditionalArgs: additionalArgs !== '',
    };
  }, [configuredBenchmark]);

  const handleRunSuccess = React.useCallback(() => {
    setIsRunModalOpen(false);
    navigate(evaluationRunsRoute(namespace));
  }, [navigate, namespace]);

  const handleRunRequest = React.useCallback(() => {
    if (!configuredBenchmark || !form.isValid) {
      return;
    }

    trackEvalHubEvent(
      EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED,
      {
        runType: 'single',
        benchmarkTypes: JSON.stringify([configuredBenchmark.id]),
        countOfBenchmarks: 1,
      },
      {
        collectionType: 'system',
        providerType: configuredBenchmark.providerId,
      },
    );
    form.handleSaveAndRun();
  }, [configuredBenchmark, form]);

  const breadcrumbItems =
    currentStep === 'selectBenchmark' ? (
      <BreadcrumbItem isActive>Select benchmark</BreadcrumbItem>
    ) : (
      [
        <BreadcrumbItem
          key="select-benchmark"
          render={() => (
            <button
              type="button"
              className="pf-v6-c-breadcrumb__link"
              onClick={() => setCurrentStep('selectBenchmark')}
              data-testid="single-benchmark-breadcrumb-select"
            >
              Select benchmark
            </button>
          )}
        />,
        <BreadcrumbItem key="benchmark" isActive>
          Benchmark
        </BreadcrumbItem>,
      ]
    );

  return (
    <ApplicationsPage
      noHeader
      breadcrumb={
        <ContextBreadcrumb
          pageName="Evaluations"
          projectDisplayName={projectDisplayName}
          homePath={evaluationsBaseRoute(namespace)}
          projectHomePath={projectHomeRoute(namespace)}
        >
          {breadcrumbItems}
        </ContextBreadcrumb>
      }
      loaded={loaded}
      loadError={loadError}
      empty={false}
    >
      <PageSection
        id="single-benchmark-page"
        hasBodyWrapper={false}
        isFilled
        className="evalhub-copy-suite-page"
      >
        {!loaded ? (
          <Bullseye>
            <Spinner aria-label="Loading benchmarks" />
          </Bullseye>
        ) : (
          <FormProvider {...form.form}>
            <div
              id="single-benchmark-editor"
              className="evalhub-copy-suite-page__editor"
              data-testid="single-benchmark-editor"
            >
              {currentStep === 'selectBenchmark' ? (
                <CopySuiteBenchmarkSelectionStep
                  providers={providers}
                  selectedBenchmarkKeys={form.selectedBenchmarkKeys}
                  maxSelectionCount={1}
                  selectionContext="single"
                  onNext={(selectedKeys) => {
                    form.applyBenchmarkSelection(selectedKeys);
                    setCurrentStep('configureBenchmark');
                  }}
                  onBack={form.handleCancel}
                  onCancel={form.handleCancel}
                />
              ) : (
                <>
                  <Title
                    headingLevel="h1"
                    size="2xl"
                    data-testid="app-page-title"
                    className="pf-v6-u-mt-0 pf-v6-u-mb-0"
                  >
                    Benchmark
                  </Title>
                  <Content component="p" className="pf-v6-u-mb-xl">
                    Choose the primary metric, test data, threshold, sample count, and advanced
                    parameters for this benchmark run.
                  </Content>
                  <CopySuiteBenchmarksStep
                    benchmarks={form.benchmarks}
                    providers={providers}
                    showWeightEdit={false}
                    weightSegments={form.weightSegments}
                    minWeightPercent={form.minWeightPercent}
                    isValid={form.isValid}
                    isSubmitting={form.isSubmitting}
                    isInteractionDisabled={form.isSubmitting}
                    onUpdateBenchmark={form.updateBenchmark}
                    onWeightsChange={form.handleWeightsChange}
                    onBack={() => setCurrentStep('selectBenchmark')}
                    onSaveAndRun={handleRunRequest}
                    onSaveOnly={() => undefined}
                    primaryActionLabel="Continue to run setup"
                    primaryActionTestId="single-benchmark-continue-to-run"
                    showSecondaryAction={false}
                    showBenchmarkNavigation={false}
                    onCancel={form.handleCancel}
                  />
                </>
              )}
            </div>
          </FormProvider>
        )}
        {isRunModalOpen && selectedBenchmark && initialRunValues ? (
          <StartEvaluationRunModal
            isOpen
            onClose={() => setIsRunModalOpen(false)}
            namespace={namespace}
            benchmark={selectedBenchmark}
            initialRunValues={initialRunValues}
            isCollectionFlow={false}
            trackingSource="single_benchmark_wizard"
            onSuccess={handleRunSuccess}
          />
        ) : null}
      </PageSection>
    </ApplicationsPage>
  );
};

export default SingleBenchmarkWizardPage;
