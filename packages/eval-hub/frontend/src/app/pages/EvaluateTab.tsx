import * as React from 'react';
import {
  Alert,
  Bullseye,
  Gallery,
  GalleryItem,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { mockBenchmarkSuiteCollections } from '~/app/mockBenchmarkSuiteCollections';
import { useCollectionsQuery } from '~/app/hooks/useCollectionsQuery';
import { evaluationCollectionsRoute } from '~/app/routes';
import BenchmarkSuiteCard from '~/app/components/BenchmarkSuiteCard';
import type { BenchmarkSuiteCardAction } from '~/app/components/BenchmarkSuiteCard';
import CreateBenchmarkSuiteCard from '~/app/components/CreateBenchmarkSuiteCard';
import DeleteConfirmationModal from '~/app/components/DeleteConfirmationModal';
import type { Collection } from '~/app/types';

// Show five suites so the create-suite card occupies the sixth slot in the preview gallery.
const MAX_VISIBLE_BENCHMARK_SUITES = 5;
// TODO: Remove this mock fallback once the collection creation API is available.
const MOCK_COLLECTIONS = mockBenchmarkSuiteCollections();

type EvaluateTabProps = {
  namespace: string;
};

function handleRunCollection(): null {
  // TODO: Redirect to the Start evaluation run form.
  return null;
}

const EvaluateTab: React.FC<EvaluateTabProps> = ({ namespace }) => {
  const [collectionToDelete, setCollectionToDelete] = React.useState<Collection | null>(null);
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

  const handleDeleteSelect = React.useCallback((collection: Collection) => {
    setCollectionToDelete(collection);
  }, []);

  const handleDeleteConfirm = React.useCallback(() => {
    // TODO: Call the BFF delete collection endpoint and refresh the gallery.
    setCollectionToDelete(null);
  }, []);

  const contextualActions: BenchmarkSuiteCardAction[] = [
    {
      id: 'edit',
      label: 'Edit',
      onSelect: () => {
        // TODO: Redirect to the edit collections form.
      },
    },
    {
      id: 'duplicate',
      label: 'Duplicate',
      onSelect: () => {
        // TODO: Call the BFF clone collection endpoint and refresh the gallery.
      },
    },
    {
      id: 'delete',
      label: 'Delete',
      isDanger: true,
      onSelect: handleDeleteSelect,
    },
  ];

  return (
    <>
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
          <Gallery hasGutter className="evalhub-benchmark-suite-gallery">
            <GalleryItem>
              <CreateBenchmarkSuiteCard
                onCreateSuite={() => {
                  // TODO: Redirect to the Create collections form.
                }}
              />
            </GalleryItem>
            {visibleCollections.map((collection) => (
              <GalleryItem key={collection.resource.id}>
                <BenchmarkSuiteCard
                  collection={collection}
                  primaryAction={{
                    label: 'Run benchmark suite',
                    onClick: handleRunCollection,
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
      {collectionToDelete && (
        <DeleteConfirmationModal
          title="Delete benchmark suite?"
          body={
            <>
              The <strong>{collectionToDelete.name}</strong> benchmark suite will be permanently
              deleted.
            </>
          }
          onClose={() => setCollectionToDelete(null)}
          onConfirm={handleDeleteConfirm}
          ariaLabel="Delete benchmark suite?"
          dataTestId="benchmark-suite-delete-modal"
          confirmTestId="benchmark-suite-delete-confirm"
          cancelTestId="benchmark-suite-delete-cancel"
        />
      )}
    </>
  );
};

export default EvaluateTab;
