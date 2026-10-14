import * as React from 'react';
import {
  Bullseye,
  Content,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  EmptyState,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateVariant,
  Flex,
  FlexItem,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { CogIcon } from '@patternfly/react-icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import { IconSize } from '@odh-dashboard/internal/types';
import { ApplicationsPage, WhosMyAdministrator } from '@odh-dashboard/ui-core';
import SupportIcon from '~/app/icons/SupportIcon';
import { evalHubEvaluationsRoute } from '~/app/utilities/routes';
import { getLatestEvaluationJob } from '~/app/utilities/evaluationUtils';
import {
  evaluationCopySuiteRoute,
  evaluationEditSuiteRoute,
  evaluationEvaluateNavigationState,
  evaluationGalleryNavigationState,
  evaluationReconfigureRoute,
} from '~/app/routes';
import { useEvaluationJobs } from '~/app/hooks/useEvaluationJobs';
import useEvalHubHealth from '~/app/hooks/useEvalHubHealth';
import { useCollectionNameMap } from '~/app/hooks/useCollectionNameMap';
import useUser from '~/app/hooks/useUser';
import EvalHubHeader from '~/app/components/EvalHubHeader';
import EvalHubProjectSelector from '~/app/components/EvalHubProjectSelector';
import EvalHubEmptyState from '~/app/components/EvalHubEmptyState';
import usePageVisibility from '~/app/hooks/usePageVisibility';
import EvaluationsTable from '~/app/components/EvaluationsTable';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';
import type { Collection, EvaluationJob } from '~/app/types';
import { useCollectionDrawer } from '~/app/hooks/useCollectionDrawer';
import StopEvaluationModal from '~/app/components/StopEvaluationModal';
import EvaluateTab from './EvaluateTab';
import GalleryTab from './GalleryTab';

import './EvaluationsTabs.scss';

const EvaluationStatusModal = React.lazy(() => import('~/app/components/EvaluationStatusModal'));

const GALLERY_TAB = 'gallery';
const EVALUATE_TAB = 'evaluate';
const RUNS_TAB = 'runs';
const TAB_QUERY_PARAM = 'tab';
const EVALUATE_DESCRIPTION =
  'Use benchmark suites to run evaluations and measure model, agent, and dataset performance. Kickstart evaluations with curated suites from the gallery, customize them, or create your own. Curated suites will be added to the benchmark suites in your project.';
const RUNS_DESCRIPTION = 'Start and manage evaluation runs for models, agents, and datasets.';

const EvaluationsPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { clusterAdmin } = useUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get(TAB_QUERY_PARAM);
  const activeTab = [GALLERY_TAB, EVALUATE_TAB, RUNS_TAB].includes(tabParam ?? '')
    ? tabParam!
    : GALLERY_TAB;
  const isRunsTab = activeTab === RUNS_TAB;

  // Pause list polling when the browser tab is backgrounded
  const isPollingEnabled = usePageVisibility();

  const { isHealthy, loaded: healthLoaded, error: healthError } = useEvalHubHealth(namespace);

  const [evaluations, loaded, error, refreshEvaluations] = useEvaluationJobs(
    { namespace },
    !isHealthy,
    isPollingEnabled,
  );
  const { collectionNameMap, loaded: collectionsLoaded } = useCollectionNameMap();
  const [selectedJob, setSelectedJob] = React.useState<
    { job: EvaluationJob; namespace: string } | undefined
  >();
  const navigate = useNavigate();
  const [pendingStopJob, setPendingStopJob] = React.useState<EvaluationJob | undefined>();
  const {
    selectedCollection,
    benchmarkDetailsMap,
    benchmarkNameMap,
    selectCollection,
    closeDrawer,
  } = useCollectionDrawer(namespace ?? '');
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();
  const [curatedCollectionToRun, setCuratedCollectionToRun] = React.useState<
    Collection | undefined
  >();
  const [selectedCollectionIsSystem, setSelectedCollectionIsSystem] = React.useState(false);

  const handleCloseDrawer = React.useCallback(() => {
    setSelectedCollectionIsSystem(false);
    closeDrawer();
  }, [closeDrawer]);

  const handleSelectCollection = React.useCallback(
    (collection: Collection, isSystemCollection = false) => {
      setSelectedCollectionIsSystem(isSystemCollection);
      selectCollection(collection);
    },
    [selectCollection],
  );

  const handleRunCollection = React.useCallback((collection: Collection) => {
    setCollectionToRun(collection);
  }, []);

  const handleRunSystemCollection = React.useCallback(
    (collection: Collection) => {
      handleCloseDrawer();
      setCuratedCollectionToRun(collection);
    },
    [handleCloseDrawer],
  );

  const handleDrawerRunCollection = React.useCallback(
    (collection: Collection, isSystemCollection: boolean) => {
      if (isSystemCollection) {
        handleRunSystemCollection(collection);
      } else {
        handleRunCollection(collection);
      }
    },
    [handleRunCollection, handleRunSystemCollection],
  );

  const handleDuplicateCollection = React.useCallback(
    (collection: Collection) => {
      const route = evaluationCopySuiteRoute(namespace, collection.resource.id);
      if (selectedCollectionIsSystem) {
        navigate(route, { state: evaluationGalleryNavigationState });
      } else {
        navigate(route, { state: evaluationEvaluateNavigationState });
      }
    },
    [navigate, namespace, selectedCollectionIsSystem],
  );

  const handleEvaluateDuplicateCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id), {
        state: evaluationEvaluateNavigationState,
      });
    },
    [navigate, namespace],
  );

  const handleEditCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationEditSuiteRoute(namespace, collection.resource.id), {
        state: evaluationEvaluateNavigationState,
      });
    },
    [navigate, namespace],
  );

  const handleRunSuccess = React.useCallback(async () => {
    setCollectionToRun(undefined);
    setCuratedCollectionToRun(undefined);
    // Wait for the post-create list request before switching tabs so the Runs tab renders the
    // refreshed result instead of the list that was loaded before the evaluation was created.
    await refreshEvaluations();
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set(TAB_QUERY_PARAM, RUNS_TAB);
    setSearchParams(nextSearchParams);
  }, [refreshEvaluations, searchParams, setSearchParams]);

  const polledJobData = React.useMemo(() => {
    if (!selectedJob) {
      return undefined;
    }
    return getLatestEvaluationJob(
      selectedJob.job,
      evaluations.find((e) => e.resource.id === selectedJob.job.resource.id),
    );
  }, [evaluations, selectedJob]);

  const onShowStatus = React.useCallback(
    (job: EvaluationJob) => {
      setSelectedJob(namespace ? { job, namespace } : undefined);
    },
    [namespace],
  );

  const onSelectTab = React.useCallback(
    (_event: React.MouseEvent, selectedTab: string | number) => {
      const nextTab = String(selectedTab);
      if (nextTab === activeTab || ![GALLERY_TAB, EVALUATE_TAB, RUNS_TAB].includes(nextTab)) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(TAB_QUERY_PARAM, nextTab);
      setSearchParams(nextSearchParams);
    },
    [activeTab, searchParams, setSearchParams],
  );

  return (
    <>
      <Drawer isExpanded={!!selectedCollection}>
        <DrawerContent
          className="evalhub-evaluations-drawer-content"
          panelContent={
            <CollectionDrawerPanel
              collection={selectedCollection}
              benchmarkDetailsMap={benchmarkDetailsMap}
              onClose={handleCloseDrawer}
              onRunCollection={handleDrawerRunCollection}
              onCustomizeCollection={handleDuplicateCollection}
              isSystemCollection={selectedCollectionIsSystem}
              primaryActionLabel="Run"
            />
          }
        >
          <DrawerContentBody className="evalhub-evaluations-drawer-body">
            <div className="evalhub-evaluations-page">
              <ApplicationsPage
                title={
                  <EvalHubHeader
                    title="Evaluations"
                    projectContent={
                      <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                        <ProjectIconWithSize size={IconSize.LG} />
                        <FlexItem>
                          <Content component="p">Project</Content>
                        </FlexItem>
                        <FlexItem>
                          <EvalHubProjectSelector
                            namespace={namespace}
                            getRedirectPath={evalHubEvaluationsRoute}
                          />
                        </FlexItem>
                      </Flex>
                    }
                  />
                }
                description={EVALUATE_DESCRIPTION}
                loaded={healthLoaded && (!isHealthy || !isRunsTab || loaded)}
                loadError={!isHealthy ? healthError : isRunsTab ? error : undefined}
                loadErrorPage={
                  <PageSection hasBodyWrapper={false} isFilled>
                    {clusterAdmin ? (
                      <EmptyState
                        headingLevel="h4"
                        icon={CogIcon}
                        titleText="Evaluations unavailable"
                        variant={EmptyStateVariant.lg}
                        data-testid="evalhub-load-error-admin-empty-state"
                      >
                        <EmptyStateBody>
                          EvalHub custom resources are currently unavailable. To use evaluations,
                          complete the EvalHub custom resources configuration.
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <EmptyState
                        headingLevel="h4"
                        icon={SupportIcon}
                        titleText="Evaluations unavailable"
                        variant={EmptyStateVariant.lg}
                        data-testid="evalhub-load-error-nonadmin-empty-state"
                      >
                        <EmptyStateBody>
                          Evaluations are unavailable due to an incomplete configuration. To use
                          this feature, contact your administrator.
                        </EmptyStateBody>
                        <EmptyStateFooter>
                          <WhosMyAdministrator />
                        </EmptyStateFooter>
                      </EmptyState>
                    )}
                  </PageSection>
                }
                empty={healthLoaded && !isHealthy && !healthError}
                emptyStatePage={
                  <PageSection hasBodyWrapper={false} isFilled>
                    {clusterAdmin ? (
                      <EmptyState
                        headingLevel="h4"
                        icon={CogIcon}
                        titleText="Evaluations unavailable"
                        variant={EmptyStateVariant.lg}
                        data-testid="evalhub-unavailable-empty-state"
                      >
                        <EmptyStateBody>
                          To use evaluations, enable the evaluation service using the TrustyAI
                          Operator.
                        </EmptyStateBody>
                      </EmptyState>
                    ) : (
                      <EmptyState
                        headingLevel="h4"
                        icon={SupportIcon}
                        titleText="Admin configuration required"
                        variant={EmptyStateVariant.lg}
                        data-testid="evalhub-nonadmin-empty-state"
                      >
                        <EmptyStateBody>
                          To use this service, request that your administrator enable evaluations
                          for this cluster.
                        </EmptyStateBody>
                        <EmptyStateFooter>
                          <WhosMyAdministrator />
                        </EmptyStateFooter>
                      </EmptyState>
                    )}
                  </PageSection>
                }
                provideChildrenPadding
                removeChildrenTopPadding
                keepBodyWrapper={false}
              >
                <Tabs
                  activeKey={activeTab}
                  onSelect={onSelectTab}
                  aria-label="Evaluations page tabs"
                  data-testid="evaluations-page-tabs"
                  className="evalhub-evaluations-page__tabs"
                  inset={{ default: 'insetNone' }}
                  mountOnEnter
                >
                  <Tab
                    eventKey={GALLERY_TAB}
                    title={<TabTitleText>Gallery</TabTitleText>}
                    aria-label="Gallery tab"
                    data-testid="gallery-tab"
                  >
                    <GalleryTab
                      namespace={namespace ?? ''}
                      benchmarkNameMap={benchmarkNameMap}
                      onSelectCollection={(collection) => handleSelectCollection(collection, true)}
                      onRunSuccess={handleRunSuccess}
                    />
                  </Tab>
                  <Tab
                    eventKey={EVALUATE_TAB}
                    title={<TabTitleText>Benchmark suites</TabTitleText>}
                    aria-label="Benchmark suites tab"
                    data-testid="evaluate-tab"
                  >
                    <EvaluateTab
                      namespace={namespace ?? ''}
                      benchmarkNameMap={benchmarkNameMap}
                      onSelectCollection={handleSelectCollection}
                      onRunCollection={handleRunCollection}
                      onEditCollection={handleEditCollection}
                      onDuplicateCollection={handleEvaluateDuplicateCollection}
                    />
                  </Tab>
                  <Tab
                    eventKey={RUNS_TAB}
                    title={<TabTitleText>Runs</TabTitleText>}
                    aria-label="Runs tab"
                    data-testid="runs-tab"
                  >
                    <Stack
                      className="evalhub-evaluations-tab-content evalhub-runs-tab"
                      data-testid="runs-tab-content"
                    >
                      {evaluations.length > 0 && (
                        <StackItem>
                          <Content
                            component="p"
                            className="evalhub-runs-tab__description"
                            data-testid="runs-tab-description"
                          >
                            {RUNS_DESCRIPTION}
                          </Content>
                        </StackItem>
                      )}
                      <StackItem>
                        {evaluations.length === 0 ? (
                          <EvalHubEmptyState />
                        ) : (
                          <EvaluationsTable
                            evaluations={evaluations}
                            loaded={loaded}
                            namespace={namespace}
                            collectionNameMap={collectionNameMap}
                            collectionsLoaded={collectionsLoaded}
                            onRefresh={refreshEvaluations}
                            onShowStatus={onShowStatus}
                          />
                        )}
                      </StackItem>
                    </Stack>
                  </Tab>
                </Tabs>
              </ApplicationsPage>
            </div>
          </DrawerContentBody>
        </DrawerContent>
      </Drawer>
      {selectedJob && selectedJob.namespace === namespace ? (
        <React.Suspense
          fallback={
            <Bullseye>
              <Spinner />
            </Bullseye>
          }
        >
          <EvaluationStatusModal
            job={selectedJob.job}
            namespace={selectedJob.namespace}
            polledJobData={polledJobData}
            onClose={() => setSelectedJob(undefined)}
            onRequestStop={(job) => {
              setSelectedJob(undefined);
              setPendingStopJob(job);
            }}
            onRequestReconfigure={(job) => {
              setSelectedJob(undefined);
              navigate(evaluationReconfigureRoute(namespace, job.resource.id));
            }}
          />
        </React.Suspense>
      ) : null}
      {pendingStopJob && namespace && (
        <StopEvaluationModal
          job={pendingStopJob}
          namespace={namespace}
          onClose={() => setPendingStopJob(undefined)}
          onComplete={refreshEvaluations}
        />
      )}
      {collectionToRun ? (
        <StartEvaluationRunModal
          isOpen
          onClose={() => setCollectionToRun(undefined)}
          namespace={namespace}
          collection={collectionToRun}
          isCollectionFlow
          modalId="evaluations-page-start-evaluation-run-modal"
          trackingSource="evaluations_page"
          onSuccess={handleRunSuccess}
        />
      ) : null}
      {curatedCollectionToRun ? (
        <CuratedSuiteRunModal
          isOpen
          onClose={() => setCuratedCollectionToRun(undefined)}
          namespace={namespace}
          collection={curatedCollectionToRun}
          trackingSource="curated_gallery"
          onSuccess={handleRunSuccess}
        />
      ) : null}
    </>
  );
};

export default EvaluationsPage;
