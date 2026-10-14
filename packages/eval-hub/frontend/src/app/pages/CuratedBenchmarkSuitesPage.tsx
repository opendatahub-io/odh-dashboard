import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Button, PageSection, Stack } from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';
import { getBenchmarkNameMap } from '~/app/components/benchmarkUtils';
import { useProviders } from '~/app/hooks/useProviders';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationCuratedBenchmarkSuitesNavigationState,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import { CURATED_SUITE_PAGE_CONFIG, isCuratedEvaluationTarget } from '~/app/curatedSuiteConfig';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import './BenchmarkSuitesPage.scss';

const CuratedBenchmarkSuitesPage: React.FC = () => {
  const { namespace, evaluationTarget } = useParams<{
    namespace: string;
    evaluationTarget: string;
  }>();
  const navigate = useNavigate();
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();
  const { providers } = useProviders(namespace ?? '');
  const benchmarkNameMap = React.useMemo(() => getBenchmarkNameMap(providers), [providers]);

  const handleCreateSuite = React.useCallback(() => {
    if (!isCuratedEvaluationTarget(evaluationTarget)) {
      return;
    }

    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
      surface: 'collection_gallery',
    });
    navigate(evaluationCreateSuiteRoute(namespace), {
      state: evaluationCuratedBenchmarkSuitesNavigationState(evaluationTarget),
    });
  }, [evaluationTarget, navigate, namespace]);

  const trackCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      if (!isCuratedEvaluationTarget(evaluationTarget)) {
        return;
      }

      trackEvalHubEvent(
        EVAL_HUB_EVENTS.COLLECTION_CUSTOMIZE_CLICKED,
        {
          collectionName: collection.name,
          surface: 'curated_gallery',
        },
        {
          collectionType: collection.resource.read_only ? 'system' : 'custom',
          providerType: collection.benchmarks?.[0]?.provider_id,
        },
      );
    },
    [evaluationTarget],
  );

  const handleCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      if (!isCuratedEvaluationTarget(evaluationTarget)) {
        return;
      }

      trackCustomizeCollection(collection);
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id), {
        state: evaluationCuratedBenchmarkSuitesNavigationState(evaluationTarget),
      });
    },
    [evaluationTarget, navigate, namespace, trackCustomizeCollection],
  );

  const handleRunCollection = React.useCallback((collection: Collection) => {
    setCollectionToRun(collection);
  }, []);

  const handleRunSuccess = React.useCallback(() => {
    setCollectionToRun(undefined);
    navigate({ pathname: evaluationsBaseRoute(namespace), search: '?tab=runs' });
  }, [navigate, namespace]);

  if (!isCuratedEvaluationTarget(evaluationTarget)) {
    return <NotFound />;
  }

  const pageConfig = CURATED_SUITE_PAGE_CONFIG[evaluationTarget];

  return (
    <>
      <ApplicationsPage
        title={pageConfig.title}
        description={pageConfig.description}
        headerAction={
          <Button
            variant="primary"
            onClick={handleCreateSuite}
            data-testid="create-benchmark-suite-button"
          >
            Create benchmark suite
          </Button>
        }
        breadcrumb={
          <Breadcrumb>
            <BreadcrumbItem
              render={() => <Link to={evaluationsBaseRoute(namespace)}>Evaluations</Link>}
            />
            <BreadcrumbItem isActive>{pageConfig.title}</BreadcrumbItem>
          </Breadcrumb>
        }
        loaded
        empty={false}
      >
        <PageSection hasBodyWrapper={false} isFilled>
          <Stack
            className="evalhub-benchmark-suites-page__content"
            data-testid="curated-benchmark-suites-page"
          >
            <BenchmarkSuitesGallery
              namespace={namespace ?? ''}
              benchmarkNameMap={benchmarkNameMap}
              scope="system"
              queryFilters={{ evaluationTargets: [evaluationTarget] }}
              requireCuratedIndex
              useMockFallback
              showCreateSuiteCard={false}
              showFilters
              showEvaluatesFilter={false}
              showPagination
              showContextualActions={false}
              trackingSurface="collection_gallery"
              primaryActionLabel="Run"
              primaryActionVariant="secondary"
              dropdownActionLabel="Customize"
              dropdownActionRoute={(collection) =>
                evaluationCopySuiteRoute(namespace, collection.resource.id)
              }
              dropdownActionState={evaluationCuratedBenchmarkSuitesNavigationState(
                evaluationTarget,
              )}
              onCreateSuite={handleCreateSuite}
              onPrimaryAction={handleRunCollection}
              onDropdownAction={trackCustomizeCollection}
              onDuplicateCollection={handleCustomizeCollection}
              onSelectCollection={handleCustomizeCollection}
            />
          </Stack>
        </PageSection>
      </ApplicationsPage>
      {collectionToRun ? (
        <CuratedSuiteRunModal
          isOpen
          onClose={() => setCollectionToRun(undefined)}
          namespace={namespace}
          collection={collectionToRun}
          trackingSource="curated_suite_page"
          onSuccess={handleRunSuccess}
        />
      ) : null}
    </>
  );
};

export default CuratedBenchmarkSuitesPage;
