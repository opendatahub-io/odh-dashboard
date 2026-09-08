import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, PageSection, Stack } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import { evaluationsBaseRoute } from '~/app/routes';
import './MyBenchmarkSuitesPage.scss';

function handleCreateSuite(): void {
  // TODO: Redirect to the Create collections form from PR #9638
}

const MyBenchmarkSuitesPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();

  return (
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
        <Stack className="evalhub-my-benchmark-suites-page__content">
          <BenchmarkSuitesGallery namespace={namespace ?? ''} onCreateSuite={handleCreateSuite} />
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default MyBenchmarkSuitesPage;
