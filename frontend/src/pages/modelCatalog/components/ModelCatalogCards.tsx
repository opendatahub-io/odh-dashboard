import React from 'react';
import { Gallery, GalleryItem, Title, Stack, StackItem } from '@patternfly/react-core';
import { CatalogModel, ModelCatalogSource } from '~/concepts/modelCatalog/types';
import { ModelCatalogCard } from './ModelCatalogCard';

const ModelCatalogSection: React.FC<{ source: ModelCatalogSource }> = ({ source }) => (
  <Stack hasGutter>
    <StackItem>
      <Title headingLevel="h2">{`${source.source} models`}</Title>
    </StackItem>
    <StackItem>
      <Gallery hasGutter>
        {source.models.map((model: CatalogModel, index) => (
          <GalleryItem key={`${source.source}-${index}`}>
            <ModelCatalogCard model={model} source={source.source} />
          </GalleryItem>
        ))}
      </Gallery>
    </StackItem>
  </Stack>
);

export const ModelCatalogCards: React.FC<{ sources: ModelCatalogSource[] }> = ({ sources }) => {
  if (sources.length === 1) {
    return (
      <Gallery hasGutter data-testid="model-catalog-cards">
        {sources[0].models.map((model: CatalogModel, index) => (
          <GalleryItem key={`${sources[0].source}-${index}`}>
            <ModelCatalogCard model={model} source={sources[0].source} />
          </GalleryItem>
        ))}
      </Gallery>
    );
  }
  return (
    <Stack hasGutter data-testid="model-catalog-cards">
      {sources.map((source) => (
        <StackItem key={source.source}>
          <ModelCatalogSection source={source} />
        </StackItem>
      ))}
    </Stack>
  );
};
