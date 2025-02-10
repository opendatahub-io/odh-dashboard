import React from 'react';
import { ModelCatalogContext } from '~/concepts/modelCatalog/context/ModelCatalogContext';

const ModelCatalogPage: React.FC = () => {
  const { modelCatalogSources } = React.useContext(ModelCatalogContext);
  const [sources, loaded, error] = modelCatalogSources;

  React.useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('Loaded:', loaded);
  }, [sources, loaded, error]);

  return <div>Model Catalog Page</div>;
};

export default ModelCatalogPage;
