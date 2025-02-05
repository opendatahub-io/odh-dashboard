import React from 'react';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EmptyModelCatalogState from './EmptyModelCatalogState';

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => (
  <EmptyModelCatalogState
    testid="empty-model-catalog-details-state"
    title="Request access to model catalog"
    description="To request access to model catalog, contact your administrator."
  />
));

export default ModelDetailsPage;
