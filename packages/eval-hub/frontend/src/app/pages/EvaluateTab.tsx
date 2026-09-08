import * as React from 'react';
import {
  Alert,
  Bullseye,
  DropdownItem,
  Gallery,
  GalleryItem,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Link, useNavigate } from 'react-router-dom';
import type { Collection } from '~/app/types';
import { mockBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import { useCollectionsQuery } from '~/app/hooks/useCollectionsQuery';
import { evaluationCollectionsRoute, evaluationStartRoute } from '~/app/routes';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';

// Show five suites so the create-suite card occupies the sixth slot in the preview gallery.
const MAX_VISIBLE_BENCHMARK_SUITES = 5;
// TODO: Remove this mock fallback once the collection creation API is available.
const MOCK_COLLECTIONS = mockBenchmarkSuiteCollections();

type EvaluateTabProps = {
  namespace: string;
};

const EvaluateTab: React.FC<EvaluateTabProps> = ({ namespace }) => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useCollectionsQuery(
    namespace,
    'tenant',
    MAX_VISIBLE_BENCHMARK_SUITES,
  );
  const apiCollections = data?.items ?? [];
  const hasApiCollections = apiCollections.length > 0;
  const collections = hasApiCollections ? apiCollections : MOCK_COLLECTIONS;
  const visibleCollections = collections.slice(0, MAX_VISIBLE_BENCHMARK_SUITES);
  const totalCount = hasApiCollections
    ? (data?.total_count ?? collections.length)
    : collections.length;

  const handleRunCollection = React.useCallback(
    (collection: Collection) => {
      const params = new URLSearchParams({
        type: 'collection',
        collectionId: collection.resource.id,
      });
      navigate(`${evaluationStartRoute(namespace)}?${params.toString()}`, {
        state: { collection },
      });
    },
    [namespace, navigate],
  );

  const contextualActions = (
    <DropdownItem value="delete" data-testid="benchmark-suite-delete-action">
      Delete
    </DropdownItem>
  );

  return (
    <Stack
      className="evalhub-evaluations-tab-content evalhub-evaluate-tab"
      data-testid="evaluate-tab-content"
    >
      <StackItem>
        <Title headingLevel="h2" size="lg">
          My benchmark suites
        </Title>
      </StackItem>
      <StackItem>
        <Gallery hasGutter minWidths={{ default: '300px' }} maxWidths={{ default: '400px' }}>
          <GalleryItem>
            <CreateBenchmarkSuiteCard
              onCreateSuite={() => {
                // TODO: Redirect to the Create suite form.
              }}
            />
          </GalleryItem>
          {visibleCollections.map((collection) => (
            <GalleryItem key={collection.resource.id}>
              <BenchmarkSuiteCard
                collection={collection}
                primaryAction={{
                  label: 'Run benchmark suite',
                  onClick: () => handleRunCollection(collection),
                }}
                contextualActions={contextualActions}
              />
            </GalleryItem>
          ))}
        </Gallery>
        {isLoading && (
          <Bullseye data-testid="benchmark-suites-loading">
            <Spinner />
          </Bullseye>
        )}
        {error && (
          <Alert
            variant="danger"
            isInline
            title="Unable to load benchmark suites"
            data-testid="benchmark-suites-load-error"
          >
            {error.message}
          </Alert>
        )}
        {!isLoading && !error && totalCount > 0 && (
          <StackItem
            className="evalhub-evaluate-tab__summary"
            data-testid="benchmark-suites-summary"
          >
            {visibleCollections.length} of {totalCount} benchmark suites{' '}
            <Link to={evaluationCollectionsRoute(namespace)}>Go to Benchmark suites</Link>
          </StackItem>
        )}
      </StackItem>
    </Stack>
  );
};

export default EvaluateTab;
