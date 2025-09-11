import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  GalleryItem,
  Grid,
  GridItem,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import useDimensions from 'react-cool-dimensions';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { conditionalArea, SupportedArea } from '#~/concepts/areas';
import EvenlySpacedGallery from '#~/components/EvenlySpacedGallery';
import ModelCatalogSectionHeader from '#~/pages/home/modelCatalog/ModelCatalogSectionHeader';
import ModelCatalogHint from '#~/pages/home/modelCatalog/ModelCatalogHint';
import { useBrowserStorage } from '#~/components/browserStorage/BrowserStorageContext';
import ProjectsLoading from '#~/pages/home/projects/ProjectsLoading';
import { CatalogModel, ModelCatalogSource } from '#~/concepts/modelCatalog/types';
import ModelCatalogSectionFooter from '#~/pages/home/modelCatalog/ModelCatalogSectionFooter';
import { FEATURED_LABEL, MAX_SHOWN_MODELS, MIN_CARD_WIDTH } from '#~/concepts/modelCatalog/const';
import { useMakeFetchObject } from '#~/utilities/useMakeFetchObject';
import { useModelCatalogSources } from '#~/concepts/modelCatalog/useModelCatalogSources';
import { ModelCatalogCard } from '#~/concepts/modelCatalog/content/ModelCatalogCard';

const ModelCatalogSection: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  false,
)(() => {
  const modelCatalogSources = useMakeFetchObject(useModelCatalogSources());
  const { data, loaded, error } = modelCatalogSources;

  const models = data.flatMap((sourceModels: ModelCatalogSource) =>
    sourceModels.models.map((vals: CatalogModel) => ({ source: sourceModels.source, ...vals })),
  );

  const featuredModels = models.filter(
    (model) => model.labels && model.labels.find((l) => l === FEATURED_LABEL),
  );

  const [visibleCardCount, setVisibleCardCount] = React.useState<number>(MAX_SHOWN_MODELS);
  const numCards = Math.min(featuredModels.length, visibleCardCount);

  const shownModels = featuredModels.length ? featuredModels.slice(0, visibleCardCount) : [];

  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    'odh.dashboard.homepage.model.catalog.hint',
    false,
  );

  const { observe } = useDimensions({
    onResize: ({ width }) => {
      const hintWidth = hintHidden ? 0 : 2 * MIN_CARD_WIDTH;
      const availWidth = width - hintWidth;
      setVisibleCardCount(
        Math.min(MAX_SHOWN_MODELS, Math.max(1, Math.floor(availWidth / MIN_CARD_WIDTH))),
      );
    },
  });

  if (error) {
    return (
      <EmptyState
        headingLevel="h3"
        icon={ExclamationCircleIcon}
        titleText="Error loading AI hub catalog"
        variant={EmptyStateVariant.lg}
        data-testid="error-loading"
      >
        <EmptyStateBody data-testid="error-loading-message">{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!loaded) {
    return <ProjectsLoading />;
  }

  if (featuredModels.length === 0) {
    return null;
  }

  return (
    <PageSection variant="secondary" hasBodyWrapper={false} data-testid="homepage-ai-hub-catalog">
      <Stack hasGutter>
        <StackItem>
          <ModelCatalogSectionHeader />
        </StackItem>
        <StackItem>
          <div ref={observe}>
            <Grid span={12} hasGutter>
              {!hintHidden && (
                <GridItem xl2={4} xl={5} lg={6} md={6} sm={6} span={12} rowSpan={1}>
                  <ModelCatalogHint isHidden={hintHidden} setHidden={() => setHintHidden(true)} />
                </GridItem>
              )}
              <GridItem
                xl2={hintHidden ? 12 : 8}
                xl={hintHidden ? 12 : 7}
                lg={hintHidden ? 12 : 6}
                md={hintHidden ? 12 : 6}
                sm={hintHidden ? 12 : 6}
                span={12}
              >
                <EvenlySpacedGallery
                  hasGutter
                  itemCount={numCards}
                  data-testid="model-catalog-card-gallery"
                >
                  {shownModels.map((model, index) => (
                    <GalleryItem key={`${model.source}-${index}`}>
                      <ModelCatalogCard model={model} source={model.source} truncate />
                    </GalleryItem>
                  ))}
                </EvenlySpacedGallery>
              </GridItem>
            </Grid>
          </div>
        </StackItem>
        <StackItem>
          <ModelCatalogSectionFooter
            shownModelCount={shownModels.length}
            totalModelCount={models.length}
          />
        </StackItem>
      </Stack>
    </PageSection>
  );
});

export default ModelCatalogSection;
