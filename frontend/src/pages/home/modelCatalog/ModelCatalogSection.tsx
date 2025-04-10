import * as React from 'react';
import {
  Button,
  GalleryItem,
  Grid,
  GridItem,
  PageSection,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import useDimensions from 'react-cool-dimensions';
import { TimesIcon } from '@patternfly/react-icons';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EvenlySpacedGallery from '~/components/EvenlySpacedGallery';
import ModelCatalogSectionHeader from '~/pages/home/modelCatalog/ModelCatalogSectionHeader';
import { ModelCatalogCard } from '~/pages/modelCatalog/components/ModelCatalogCard';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import ModelCatalogHint from '~/pages/home/modelCatalog/ModelCatalogHint';
import { useBrowserStorage } from '~/components/browserStorage';
import ProjectsLoading from '~/pages/home/projects/ProjectsLoading';
import { CatalogModel, ModelCatalogSource } from '~/concepts/modelCatalog/types';
import ModelCatalogSectionFooter from '~/pages/home/modelCatalog/ModelCatalogSectionFooter';

const MAX_SHOWN_MODELS = 4;
const MIN_MODEL_CARD_WIDTH = 250;

const ModelCatalogSection: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const { data, loaded } = modelCatalogSources;
  const models = React.useMemo(
    () =>
      data.flatMap((sourceModels: ModelCatalogSource) =>
        sourceModels.models.map((vals: CatalogModel) => ({ source: sourceModels.source, ...vals })),
      ),
    [data],
  );
  const [visibleCardCount, setVisibleCardCount] = React.useState<number>(MAX_SHOWN_MODELS);
  const { observe } = useDimensions({
    onResize: ({ width }) => {
      setVisibleCardCount(Math.min(MAX_SHOWN_MODELS, Math.floor(width / MIN_MODEL_CARD_WIDTH)));
    },
  });
  const shownModels = React.useMemo(
    () => (loaded ? models.slice(0, visibleCardCount) : []),
    [loaded, models, visibleCardCount],
  );
  const numCards = Math.min(models.length, visibleCardCount);

  const [hintHidden, setHintHidden] = useBrowserStorage<boolean>(
    'odh.dashboard.model.catalog.hint',
    false,
  );

  const hintActions = (
    <Button
      icon={<TimesIcon />}
      data-testid="model-catalog-hint-close"
      aria-label="model catalog hint dismiss"
      variant="plain"
      onClick={() => setHintHidden(true)}
    />
  );

  if (models.length === 0) {
    return null;
  }

  return (
    <PageSection
      variant="secondary"
      hasBodyWrapper={false}
      data-testid="landing-page-model-catalog"
    >
      <Stack hasGutter>
        <StackItem>
          <ModelCatalogSectionHeader />
        </StackItem>
        <StackItem>
          {!loaded ? (
            <ProjectsLoading />
          ) : (
            <div ref={observe}>
              <Grid span={12} hasGutter>
                {!hintHidden && (
                  <GridItem
                    lg={4}
                    md={5}
                    sm={12}
                    style={{
                      display: 'flex',
                      alignItems: 'stretch',
                    }}
                  >
                    <ModelCatalogHint hidden={hintHidden} actions={hintActions} />
                  </GridItem>
                )}
                <GridItem lg={hintHidden ? 12 : 8} md={hintHidden ? 12 : 7} sm={12}>
                  <EvenlySpacedGallery hasGutter itemCount={numCards}>
                    {models.map((model, index) => (
                      <GalleryItem key={`${model.source}-${index}`}>
                        <ModelCatalogCard model={model} source={model.source} />
                      </GalleryItem>
                    ))}
                  </EvenlySpacedGallery>
                </GridItem>
              </Grid>
            </div>
          )}
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
