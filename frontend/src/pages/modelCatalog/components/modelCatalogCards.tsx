import React from 'react';
import { Gallery, GalleryItem } from '@patternfly/react-core';
import { CatalogModel, ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { ModelCatalogCard } from './modelCatalogCard';

export const ModelCatalogCards: React.FC<{ sources: ModelCatalogSource[] }> = ({ sources }) => (
  <Gallery hasGutter data-testid="model-catalog-cards">
    {sources.map((mcs, srcIndex) =>
      mcs.models.map((cm: CatalogModel, modelIndex) => (
        <GalleryItem key={`${srcIndex}-${modelIndex}`}>
          <ModelCatalogCard model={cm} source={mcs.source} />
        </GalleryItem>
      )),
    )}
  </Gallery>
);
