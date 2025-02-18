import * as React from 'react';

import { PageSection } from '@patternfly/react-core';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import EmptyModelCatalogState from '~/pages/modelCatalog/EmptyModelCatalogState';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';
import { ModelCatalogCards } from '~/pages/modelCatalog/components/ModelCatalogCards';

const ModelCatalog: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const renderStateProps = {
    empty: modelCatalogSources.data.length === 0,
    emptyStatePage: (
      <EmptyModelCatalogState
        data-testid="empty-model-catalog-state"
        title={
          modelCatalogSources.error
            ? 'Unable to load model catalog'
            : 'Request access to model catalog'
        }
        description={
          modelCatalogSources.error
            ? 'Refresh the page or try again later'
            : 'To request access to model catalog, contact your administrator.'
        }
        headerIcon={() => (
          <img
            src={typedEmptyImage(
              ProjectObjectType.registeredModels,
              modelCatalogSources.error ? 'Error' : undefined,
            )}
            alt=""
          />
        )}
      />
    ),
    headerContent: null,
    loaded: modelCatalogSources.loaded,
    loadError: modelCatalogSources.error,
    errorMessage: 'Unable to load model catalog',
  };

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Model Catalog" objectType={ProjectObjectType.registeredModels} />
      }
      {...renderStateProps}
    >
      <PageSection isFilled>
        <ModelCatalogCards sources={modelCatalogSources.data} />
      </PageSection>
    </ApplicationsPage>
  );
});

export default ModelCatalog;
