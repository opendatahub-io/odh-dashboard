import * as React from 'react';
import { Stack } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import CuratedSuiteRunModal from '~/app/components/CuratedSuiteRunModal';
import {
  evaluationCopySuiteRoute,
  evaluationCreateSuiteRoute,
  evaluationGalleryNavigationState,
  evaluationsBaseRoute,
} from '~/app/routes';
import type { BenchmarkNameMap } from '~/app/components/benchmarkUtils';
import type { Collection } from '~/app/types';

type GalleryTabProps = {
  namespace: string;
  benchmarkNameMap: BenchmarkNameMap;
  onSelectCollection: (collection: Collection) => void;
};

const GalleryTab: React.FC<GalleryTabProps> = ({
  namespace,
  benchmarkNameMap,
  onSelectCollection,
}) => {
  const navigate = useNavigate();
  const [collectionToRun, setCollectionToRun] = React.useState<Collection | undefined>();

  const handleCreateSuite = React.useCallback(() => {
    navigate(evaluationCreateSuiteRoute(namespace), {
      state: evaluationGalleryNavigationState,
    });
  }, [navigate, namespace]);

  const handleCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id), {
        state: evaluationGalleryNavigationState,
      });
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
        benchmarkNameMap={benchmarkNameMap}
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
        createSuiteRouteState={evaluationGalleryNavigationState}
        dropdownActionRoute={(collection) =>
          evaluationCopySuiteRoute(namespace, collection.resource.id)
        }
        dropdownActionState={evaluationGalleryNavigationState}
        onCreateSuite={handleCreateSuite}
        onPrimaryAction={handleRunCollection}
        onDropdownAction={handleCustomizeCollection}
        onDuplicateCollection={handleCustomizeCollection}
        onSelectCollection={onSelectCollection}
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
