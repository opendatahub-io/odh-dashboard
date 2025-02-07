import * as React from 'react';
import { Outlet } from 'react-router';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import {
  ModelCatalogContext,
  ModelCatalogContextProvider,
} from '~/concepts/modelCatalog/context/ModelCatalogContext';
import EmptyModelCatalogState from './EmptyModelCatalogState';

type ApplicationPageProps = React.ComponentProps<typeof ApplicationsPage>;

type ApplicationPageRenderState = Pick<
  ApplicationPageProps,
  'emptyStatePage' | 'empty' | 'headerContent'
>;
const ModelCatalogCoreLoader: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
  if (modelCatalogSources.length === 0) {
    renderStateProps = {
      empty: true,
      emptyStatePage: (
        <>
          <EmptyModelCatalogState
            testid="empty-model-catalog-state"
            title="Request access to model catalog"
            description="To request access to model catalog, contact your administrator."
            headerIcon={() => (
              <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
            )}
          />
        </>
      ),
      headerContent: null,
    };
  } else {
    return (
      <ModelCatalogContextProvider>
        <Outlet />
      </ModelCatalogContextProvider>
    );
  }

  return (
    <ApplicationsPage
      title={
        <TitleWithIcon title="Model Catalog" objectType={ProjectObjectType.registeredModels} />
      }
      {...renderStateProps}
      loaded
      provideChildrenPadding
    />
  );
});

export default ModelCatalogCoreLoader;
