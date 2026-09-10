import * as React from 'react';
import { Breadcrumb, BreadcrumbItem, Button, PageSection, Stack } from '@patternfly/react-core';
import { Link, useNavigate, useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';
import { CURATED_SUITE_PAGE_CONFIG, isCuratedAiEntity } from '~/app/curatedSuiteConfig';
import './BenchmarkSuitesPage.scss';

const CuratedBenchmarkSuitesPage: React.FC = () => {
  const { namespace, aiEntity } = useParams<{ namespace: string; aiEntity: string }>();
  const navigate = useNavigate();

  const handleCreateSuite = React.useCallback(() => {
    navigate(evaluationCreateSuiteRoute(namespace));
  }, [navigate, namespace]);

  const handleCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id), {
        state: { sourceAiEntity: aiEntity },
      });
    },
    [aiEntity, navigate, namespace],
  );

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
            useMockFallback
            showCreateSuiteCard={false}
            showFilters
            showEvaluatesFilter={false}
            showPagination
            showContextualActions={false}
            primaryActionLabel="Customize"
            primaryActionRoute={(collection) =>
              evaluationCopySuiteRoute(namespace, collection.resource.id)
            }
            primaryActionState={{ sourceAiEntity: aiEntity }}
            onCreateSuite={handleCreateSuite}
            onPrimaryAction={handleCustomizeCollection}
            onDuplicateCollection={handleCustomizeCollection}
            onSelectCollection={handleCustomizeCollection}
          />
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default CuratedBenchmarkSuitesPage;
