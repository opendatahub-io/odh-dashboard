import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
  Stack,
} from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import StartEvaluationRunModal from '~/app/components/StartEvaluationRunModal';
import { useCollectionDrawer } from '~/app/hooks/useCollectionDrawer';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import './BenchmarkSuitesPage.scss';

const BenchmarkSuitesPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const navigate = useNavigate();
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();
  const { selectedCollection, benchmarkDetailsMap, selectCollection, closeDrawer } =
    useCollectionDrawer(namespace ?? '');

  const handleCreateSuite = React.useCallback(() => {
    navigate(evaluationCreateSuiteRoute(namespace));
  }, [navigate, namespace]);

  const handleRunCollection = React.useCallback((collection: Collection) => {
    setCollectionToRun(collection);
  }, []);

  const handleDuplicateCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id));
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
              primaryActionLabel="Run benchmark suite"
            />
          }
        >
          <DrawerContentBody>
            <ApplicationsPage
              title="My benchmark suites"
              description="View, run, and manage all benchmark suites you have created or saved."
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
                  <BreadcrumbItem isActive>My benchmark suites</BreadcrumbItem>
                </Breadcrumb>
              }
              loaded
              empty={false}
            >
              <PageSection hasBodyWrapper={false} isFilled>
                <Stack className="evalhub-benchmark-suites-page__content">
                  <BenchmarkSuitesGallery
                    namespace={namespace ?? ''}
                    showCreateSuiteCard={false}
                    showFilters
                    showPagination
                    onCreateSuite={handleCreateSuite}
                    onPrimaryAction={handleRunCollection}
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
