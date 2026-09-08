import * as React from 'react';
import {
  Breadcrumb,
  BreadcrumbItem,
  Drawer,
  DrawerContent,
  DrawerContentBody,
  PageSection,
  Stack,
} from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CollectionDrawerPanel from '~/app/components/CollectionDrawerPanel';
import { useCollectionDrawer } from '~/app/hooks/useCollectionDrawer';
import { evaluationsBaseRoute } from '~/app/routes';
import './BenchmarkSuitesPage.scss';

function handleCreateSuite(): void {
  // TODO: Redirect to the Create collections form from PR #9638
}

function handleRunCollection(): null {
  // TODO: Redirect to the Start evaluation run form.
  return null;
}

const BenchmarkSuitesPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const { selectedCollection, benchmarkDetailsMap, selectCollection, closeDrawer } =
    useCollectionDrawer(namespace ?? '');

  return (
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
                  onCreateSuite={handleCreateSuite}
                  onSelectCollection={selectCollection}
                />
              </Stack>
            </PageSection>
          </ApplicationsPage>
        </DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default BenchmarkSuitesPage;
