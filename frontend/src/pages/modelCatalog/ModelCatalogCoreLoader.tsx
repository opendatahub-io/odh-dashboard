import * as React from 'react';
import { Outlet } from 'react-router';
import { conditionalArea, SupportedArea } from '~/concepts/areas';
import {  ModelCatalogContextProvider } from '~/concepts/modelCatalog/context/ModelCatalogContext';

const ModelCatalogCoreLoader: React.FC = conditionalArea(
  SupportedArea.MODEL_CATALOG,
  true,
)(() => (
  <ModelCatalogContextProvider>
    <Outlet />
  </ModelCatalogContextProvider>
));
// =======
// )(() => {
//   const { modelCatalogSources } = React.useContext(ModelCatalogContext);
//   let renderStateProps: ApplicationPageRenderState & { children?: React.ReactNode };
//   if (modelCatalogSources.length === 0) {
//     renderStateProps = {
//       empty: false,
//       emptyStatePage: (
//         <>
//           <EmptyModelCatalogState
//             testid="empty-model-catalog-state"
//             title="[loader]Request access to model catalog"
//             description="To request access to model catalog, contact your administrator."
//             headerIcon={() => (
//               <img src={typedEmptyImage(ProjectObjectType.registeredModels)} alt="" />
//             )}
//           />
//         </>
//       ),
//       headerContent: null,
//     };
//   } else {
//     return (
//       <ModelCatalogContextProvider>
//         <Outlet />
//       </ModelCatalogContextProvider>
//     );
//   }

//   return (
//     <ApplicationsPage
//       title={
//         <TitleWithIcon title="Model Catalog" objectType={ProjectObjectType.registeredModels} />
//       }
//       {...renderStateProps}
//       loaded
//       provideChildrenPadding
//     >
//       <PageSection isFilled>
//         <ModelCatalogCards sources={modelCatalogSources} />
//       </PageSection>
//     </ApplicationsPage>
//   );
// });
// >>>>>>> 7252f9ab (feat: catalog page cards)

export default ModelCatalogCoreLoader;
