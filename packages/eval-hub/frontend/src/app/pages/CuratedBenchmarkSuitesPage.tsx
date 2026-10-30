import * as React from 'react';
import {
  BreadcrumbItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
  Stack,
} from '@patternfly/react-core';
import { useNavigate, useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import { useCollectionDrawer } from '~/app/hooks/useCollectionDrawer';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationCuratedBenchmarkSuitesNavigationState,
  evaluationsBaseRoute,
  projectHomeRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { CURATED_SUITE_PAGE_CONFIG, isCuratedEvaluationTarget } from '~/app/curatedSuiteConfig';
import './BenchmarkSuitesPage.scss';

const CuratedBenchmarkSuitesPage: React.FC = () => {
  const { namespace, evaluationTarget } = useParams<{
    namespace: string;
    evaluationTarget: string;
  }>();
  const navigate = useNavigate();
  const projectDisplayName = useProjectDisplayName(namespace);
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();
  const {
    selectedCollection,
    benchmarkDetailsMap,
    benchmarkNameMap,
    selectCollection,
    closeDrawer,
  } = useCollectionDrawer(namespace ?? '');

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

  const handleDrawerRunCollection = React.useCallback(
    (collection: Collection, isSystemCollection: boolean) => {
      if (isSystemCollection) {
        closeDrawer();
      }
      handleRunCollection(collection);
    },
    [closeDrawer, handleRunCollection],
  );

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
      <Drawer isExpanded={!!selectedCollection}>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={selectedCollection}
              benchmarkDetailsMap={benchmarkDetailsMap}
              onClose={closeDrawer}
              onRunCollection={handleDrawerRunCollection}
              onCustomizeCollection={handleCustomizeCollection}
              isSystemCollection
              primaryActionLabel="Run"
            />
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title={pageConfig.title}
              description={pageConfig.description}
              headerAction={
                <Button
                  variant="primary"
                  onClick={handleCreateSuite}
                  data-testid="create-benchmark-suite-button"
                >
                  Create collection
                </Button>
              }
              breadcrumb={
                <ContextBreadcrumb
                  pageName="Evaluations"
                  projectDisplayName={projectDisplayName}
                  homePath={evaluationsBaseRoute(namespace)}
                  projectHomePath={projectHomeRoute(namespace)}
                >
                  <BreadcrumbItem isActive>{pageConfig.title}</BreadcrumbItem>
                </ContextBreadcrumb>
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
                    onSelectCollection={selectCollection}
                  />
                </Stack>
              </PageSection>
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
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
