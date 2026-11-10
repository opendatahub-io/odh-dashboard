import * as React from 'react';
import { BreadcrumbItem, Bullseye, PageSection, Spinner } from '@patternfly/react-core';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import CopySuiteBenchmarkSelectionStep from '~/app/components/CopySuiteBenchmarkSelectionStep';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import { useProviders } from '~/app/hooks/useProviders';
import {
  evaluationEvaluateRoute,
  evaluationGalleryRoute,
  evaluationStartRoute,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { buildFlatBenchmarkByKey } from '~/app/utilities/benchmarkDetailsUtils';

import './CopySuitePage.scss';

const SingleBenchmarkWizardPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const projectDisplayName = useProjectDisplayName(namespace);
  const { providers, loaded, loadError } = useProviders(namespace ?? '');

  const navigationState =
    typeof location.state === 'object' && location.state !== null ? location.state : undefined;
  const navigationSource = navigationState?.source;
  const selectedBenchmarkKey =
    typeof navigationState?.selectedBenchmarkKey === 'string'
      ? navigationState.selectedBenchmarkKey
      : undefined;
  const selectedBenchmarkKeys = selectedBenchmarkKey ? [selectedBenchmarkKey] : [];
  const cancelRoute =
    navigationSource === 'gallery'
      ? evaluationGalleryRoute(namespace)
      : evaluationEvaluateRoute(namespace);

  const flatBenchmarksByKey = React.useMemo(() => buildFlatBenchmarkByKey(providers), [providers]);

  const handleCancel = React.useCallback(() => navigate(cancelRoute), [cancelRoute, navigate]);

  const handleNext = React.useCallback(
    (selectedKeys: string[]) => {
      const selectedBenchmark = selectedKeys[0]
        ? flatBenchmarksByKey.get(selectedKeys[0])
        : undefined;
      if (!selectedBenchmark || !namespace) {
        return;
      }

      trackEvalHubEvent(
        EVAL_HUB_EVENTS.BENCHMARK_RUN_SELECTED,
        {
          runType: 'single',
          benchmarkTypes: JSON.stringify([selectedBenchmark.id]),
          countOfBenchmarks: 1,
        },
        {
          collectionType: 'system',
          providerType: selectedBenchmark.providerId,
        },
      );

      navigate(`${evaluationStartRoute(namespace)}?type=benchmark`, {
        state: {
          benchmark: selectedBenchmark,
          source: navigationSource,
        },
      });
    },
    [flatBenchmarksByKey, namespace, navigate, navigationSource],
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
          <BreadcrumbItem isActive data-testid="single-benchmark-breadcrumb">
            Benchmarks
          </BreadcrumbItem>
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
          <CopySuiteBenchmarkSelectionStep
            providers={providers}
            selectedBenchmarkKeys={selectedBenchmarkKeys}
            maxSelectionCount={1}
            selectionContext="single"
            onNext={handleNext}
            onBack={handleCancel}
            onCancel={handleCancel}
          />
        )}
      </PageSection>
    </ApplicationsPage>
  );
};

export default SingleBenchmarkWizardPage;
