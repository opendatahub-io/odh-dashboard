import * as React from 'react';
import { Stack } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { Collection } from '~/app/types';

type GalleryTabProps = {
  namespace: string;
};

const GalleryTab: React.FC<GalleryTabProps> = ({ namespace }) => {
  const navigate = useNavigate();
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();

  const handleCreateSuite = React.useCallback(() => {
    navigate(evaluationCreateSuiteRoute(namespace));
  }, [navigate, namespace]);

  const handleCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id));
    },
    [navigate, namespace],
  );

  const handleRunCollection = React.useCallback((collection: Collection) => {
    setCollectionToRun(collection);
  }, []);

  const handleRunSuccess = React.useCallback(() => {
    setCollectionToRun(undefined);
    navigate({ pathname: evaluationsBaseRoute(namespace), search: '?tab=runs' });
  }, [navigate, namespace]);

  return (
    <Stack
      className="evalhub-evaluations-tab-content evalhub-gallery-tab"
      data-testid="gallery-tab-content"
    >
      <BenchmarkSuitesGallery
        namespace={namespace}
        scope="system"
        requireCuratedIndex
        useMockFallback
        showFilters
        showEvaluatesFilter
        showPagination
        showCreateSuiteCard={false}
        showContextualActions={false}
        primaryActionLabel="Run"
        primaryActionVariant="secondary"
        dropdownActionLabel="Customize"
        dropdownActionRoute={(collection) =>
          evaluationCopySuiteRoute(namespace, collection.resource.id)
        }
        onCreateSuite={handleCreateSuite}
        onPrimaryAction={handleRunCollection}
        onDropdownAction={handleCustomizeCollection}
        onDuplicateCollection={handleCustomizeCollection}
        onSelectCollection={handleCustomizeCollection}
        createSuiteRoute={evaluationCreateSuiteRoute(namespace)}
      />
      {collectionToRun ? (
        <CuratedSuiteRunModal
          isOpen
          onClose={() => setCollectionToRun(undefined)}
          namespace={namespace}
          collection={collectionToRun}
          trackingSource="curated_gallery"
          onSuccess={handleRunSuccess}
        />
      ) : null}
    </Stack>
  );
};

export default GalleryTab;
