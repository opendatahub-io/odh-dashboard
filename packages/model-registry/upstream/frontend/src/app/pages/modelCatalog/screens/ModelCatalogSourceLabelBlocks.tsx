import React from 'react';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { CategoryName } from '~/app/modelCatalogTypes';
import { CatalogSourceLabelToggle } from '~/app/shared/components/catalog';
import { useUserInteraction } from '~/concepts/userInteraction';
import {
  MODEL_CATALOG_EVENTS,
  ModelCatalogCategorySelectedProperties,
  toCategorySelectedValue,
} from '~/app/pages/modelCatalog/tracking';

const ModelCatalogSourceLabelBlocks: React.FC = () => {
  const {
    catalogSources,
    catalogLabels,
    setSelectedSourceLabel,
    selectedSourceLabel,
    emptyCategoryLabels,
    categoriesResolved,
  } = React.useContext(ModelCatalogContext);
  const { trackSimpleEvent } = useUserInteraction();

  if (!categoriesResolved) {
    return null;
  }

  const handleSelectSourceLabel = (label: string | undefined) => {
    const nextLabel = label ?? CategoryName.allModels;
    setSelectedSourceLabel(nextLabel);
    const properties: ModelCatalogCategorySelectedProperties = {
      category: toCategorySelectedValue(nextLabel),
    };
    trackSimpleEvent(MODEL_CATALOG_EVENTS.CATEGORY_SELECTED, properties);
  };

  return (
    <CatalogSourceLabelToggle
      catalogSources={catalogSources}
      catalogLabels={catalogLabels}
      selectedSourceLabel={selectedSourceLabel}
      onSelectSourceLabel={handleSelectSourceLabel}
      allBlockLabel={CategoryName.allModels}
      allBlockDisplayName={CategoryName.allModels}
      emptyCategoryLabels={emptyCategoryLabels}
      className="pf-v6-u-pb-0"
      ariaLabel="Source label selection"
    />
  );
};

export default ModelCatalogSourceLabelBlocks;
