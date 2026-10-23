import * as React from 'react';
import {
  BreadcrumbItem,
  Button,
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  Flex,
  FlexItem,
  PageSection,
  Stack,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import ContextBreadcrumb from '~/app/components/ContextBreadcrumb';
import { useProjectDisplayName } from '~/app/hooks/useProjectDisplayName';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import { useCollectionDrawer } from '~/app/hooks/useCollectionDrawer';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationBenchmarkSuitesNavigationState,
  evaluationBenchmarkSuitesRoute,
  evaluationEditSuiteRoute,
  evaluationEvaluateRoute,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import { trackEvalHubEvent } from '~/app/tracking/evalhubTracking';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import './BenchmarkSuitesPage.scss';

const BenchmarkSuitesPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
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
    trackEvalHubEvent(EVAL_HUB_EVENTS.COLLECTION_CREATE_OPENED, {
      surface: 'my_benchmark_suites',
    });
    navigate(evaluationCreateSuiteRoute(namespace), {
      state: evaluationBenchmarkSuitesNavigationState,
    });
  }, [navigate, namespace]);

  const handleRunCollection = React.useCallback((collection: Collection) => {
    setCollectionToRun(collection);
  }, []);

  const handleDuplicateCollection = React.useCallback(
    (collection: Collection) => {
      trackEvalHubEvent(
        EVAL_HUB_EVENTS.COLLECTION_CUSTOMIZE_CLICKED,
        {
          collectionName: collection.name,
          surface: 'my_benchmark_suites',
        },
        {
          collectionType: collection.resource.read_only ? 'system' : 'custom',
          providerType: collection.benchmarks?.[0]?.provider_id,
        },
      );
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id), {
        state: evaluationBenchmarkSuitesNavigationState,
      });
    },
    [navigate, namespace],
  );

  const handleEditCollection = React.useCallback(
    (collection: Collection) => {
      trackEvalHubEvent(
        EVAL_HUB_EVENTS.COLLECTION_EDIT_OPENED,
        {
          collectionName: collection.name,
          surface: 'my_benchmark_suites',
        },
        {
          collectionType: collection.resource.read_only ? 'system' : 'custom',
          providerType: collection.benchmarks?.[0]?.provider_id,
        },
      );
      navigate(evaluationEditSuiteRoute(namespace, collection.resource.id), {
        state: evaluationBenchmarkSuitesNavigationState,
      });
    },
    [navigate, namespace],
  );

  const handleRunSuccess = React.useCallback(() => {
    setCollectionToRun(undefined);
    navigate({ pathname: evaluationsBaseRoute(namespace), search: '?tab=runs' });
  }, [navigate, namespace]);

  return (
    <>
      <Drawer isExpanded={!!selectedCollection}>
        <DrawerContent
          panelContent={
            <CollectionDrawerPanel
              collection={selectedCollection}
              benchmarkDetailsMap={benchmarkDetailsMap}
              onClose={closeDrawer}
              onRunCollection={handleRunCollection}
              primaryActionLabel="Run"
            />
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title={
                <EvalHubHeader
                  title="My benchmark collections"
                  projectContent={
                    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                      <ProjectIconWithSize size={IconSize.LG} />
                      <FlexItem>
                        <Content component="p">Project</Content>
                      </FlexItem>
                      <FlexItem>
                        <EvalHubProjectSelector
                          namespace={namespace}
                          getRedirectPath={evaluationBenchmarkSuitesRoute}
                        />
                      </FlexItem>
                    </Flex>
                  }
                />
              }
              description="View, run, and manage all benchmark collections you have created or saved."
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
                  projectHomePath={`/projects/${namespace}`}
                >
                  <BreadcrumbItem
                    render={() => (
                      <Link to={evaluationEvaluateRoute(namespace)}>Benchmark collections</Link>
                    )}
                  />
                  <BreadcrumbItem isActive>My benchmark collections</BreadcrumbItem>
                </ContextBreadcrumb>
              }
              loaded
              empty={false}
            >
              <PageSection hasBodyWrapper={false} isFilled>
                <Stack className="evalhub-benchmark-suites-page__content">
                  <BenchmarkSuitesGallery
                    namespace={namespace ?? ''}
                    benchmarkNameMap={benchmarkNameMap}
                    showCreateSuiteCard={false}
                    showFilters
                    showPagination
                    onCreateSuite={handleCreateSuite}
                    onPrimaryAction={handleRunCollection}
                    onEditCollection={handleEditCollection}
                    onDuplicateCollection={handleDuplicateCollection}
                    onSelectCollection={selectCollection}
                  />
                </Stack>
              </PageSection>
            </ApplicationsPage>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      {collectionToRun ? (
        <StartEvaluationRunModal
          isOpen
          onClose={() => setCollectionToRun(undefined)}
          namespace={namespace}
          collection={collectionToRun}
          isCollectionFlow
          modalId="benchmark-suites-page-start-evaluation-run-modal"
          trackingSource="benchmark_suites_page"
          onSuccess={handleRunSuccess}
        />
      ) : null}
    </>
  );
};

export default BenchmarkSuitesPage;
