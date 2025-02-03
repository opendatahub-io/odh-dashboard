import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EmptyModelCatalogState from './EmptyModelCatalogState';

const renderStateProps = {
  empty: true,
  emptyStatePage: (
    <EmptyModelCatalogState
      testid="empty-model-catalog-details-state"
      title="Request access to model catalog"
      description="To request access to model catalog, contact your administrator."
    />
  ),
  headerContent: null,
};

const ModelDetailsPage: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => (
  <ApplicationsPage
    title={
      <TitleWithIcon
        title="Model Catalog - Model Details"
        objectType={ProjectObjectType.registeredModels}
      />
    }
    {...renderStateProps}
    loaded
    provideChildrenPadding
  />
));

export default ModelDetailsPage;
