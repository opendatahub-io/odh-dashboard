import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Button, PageSection, Stack } from '@patternfly/react-core';
import { Link, useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import { evaluationsBaseRoute } from '~/app/routes';
import './BenchmarkSuitesPage.scss';

const CURATED_SUITE_PAGE_CONFIG = {
  agent: {
    title: 'Agent benchmark suites',
    description: 'Select a benchmark suite to evaluate your agent.',
  },
  model: {
    title: 'Model benchmark suites',
    description: 'Select a benchmark suite to evaluate your model.',
  },
} as const;

type CuratedAiEntity = keyof typeof CURATED_SUITE_PAGE_CONFIG;

const isCuratedAiEntity = (value: string | undefined): value is CuratedAiEntity =>
  value === 'agent' || value === 'model';

const CuratedBenchmarkSuitesPage: React.FC = () => {
  const { namespace, aiEntity } = useParams<{ namespace: string; aiEntity: string }>();

  const handleCreateSuite = React.useCallback(() => {
    // TODO: Redirect to the Create collections form from PR #9638.
  }, []);

  const handleCustomizeCollection = React.useCallback(() => {
    // TODO: Redirect to the Create collections form with this curated suite selected.
  }, []);

  if (!isCuratedAiEntity(aiEntity)) {
    return <NotFound />;
  }

  const pageConfig = CURATED_SUITE_PAGE_CONFIG[aiEntity];

  return (
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
            scope="curated"
            queryFilters={{ aiEntities: [aiEntity] }}
            showCreateSuiteCard={false}
            showFilters
            showEvaluatesFilter={false}
            showPagination
            showContextualActions={false}
            primaryActionLabel="Customize"
            onCreateSuite={handleCreateSuite}
            onPrimaryAction={handleCustomizeCollection}
            onSelectCollection={handleCustomizeCollection}
          />
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CuratedBenchmarkSuitesPage;
