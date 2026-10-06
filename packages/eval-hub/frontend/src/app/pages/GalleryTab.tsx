import * as React from 'react';
import { Stack } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import BenchmarkSuitesGallery from '~/app/components/BenchmarkSuitesGallery';
import { evaluationCopySuiteRoute, evaluationCreateSuiteRoute } from '~/app/routes';
import type { Collection } from '~/app/types';

type GalleryTabProps = {
  namespace: string;
};

const GalleryTab: React.FC<GalleryTabProps> = ({ namespace }) => {
  const navigate = useNavigate();

  const handleCreateSuite = React.useCallback(() => {
    navigate(evaluationCreateSuiteRoute(namespace));
  }, [navigate, namespace]);

  const handleCustomizeCollection = React.useCallback(
    (collection: Collection) => {
      navigate(evaluationCopySuiteRoute(namespace, collection.resource.id));
    },
    [navigate, namespace],
  );

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
        primaryActionLabel="Customize"
        primaryActionRoute={(collection) =>
          evaluationCopySuiteRoute(namespace, collection.resource.id)
        }
        onCreateSuite={handleCreateSuite}
        onPrimaryAction={handleCustomizeCollection}
        onDuplicateCollection={handleCustomizeCollection}
        onSelectCollection={handleCustomizeCollection}
        createSuiteRoute={evaluationCreateSuiteRoute(namespace)}
      />
    </Stack>
  );
};

export default GalleryTab;
