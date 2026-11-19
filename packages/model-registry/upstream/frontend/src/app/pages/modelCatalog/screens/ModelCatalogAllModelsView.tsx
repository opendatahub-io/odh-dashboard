import React from 'react';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { CategoryName } from '~/app/modelCatalogTypes';
import { CatalogAllItemsView } from '~/app/shared/components/catalog';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MODEL_CATALOG_EVENTS,
  ModelCatalogCategorySelectedProperties,
  toCategorySelectedValue,
} from '~/app/pages/modelCatalog/tracking';
import ModelCatalogCategorySection from './ModelCatalogCategorySection';

type ModelCatalogAllModelsViewProps = {
  searchTerm: string;
};

const ModelCatalogAllModelsView: React.FC<ModelCatalogAllModelsViewProps> = ({ searchTerm }) => {
  const { catalogSources, catalogLabels, setSelectedSourceLabel } =
    React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();

  const handleShowMoreCategory = React.useCallback(
    (categoryLabel: string) => {
      setSelectedSourceLabel(categoryLabel);
      const properties: ModelCatalogCategorySelectedProperties = {
        category: toCategorySelectedValue(categoryLabel),
      };
      trackSimpleEvent(MODEL_CATALOG_EVENTS.CATEGORY_SELECTED, properties);
    },
    [setSelectedSourceLabel, trackSimpleEvent],
  );

  return (
    <CatalogAllItemsView
      searchTerm={searchTerm}
      catalogSources={catalogSources}
      catalogLabels={catalogLabels}
      pageSize={4}
      otherSectionKey={CategoryName.otherModels}
      onShowMore={handleShowMoreCategory}
      renderCategorySection={(label, term, pageSize, onShowMore) => (
        <ModelCatalogCategorySection
          label={label}
          searchTerm={term}
          pageSize={pageSize}
          catalogSources={catalogSources}
          onShowMore={onShowMore}
        />
      )}
    />
  );
};

export default ModelCatalogAllModelsView;
