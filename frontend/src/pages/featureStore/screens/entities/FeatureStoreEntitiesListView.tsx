import React from 'react';
import { EntityList } from '#~/pages/featureStore/types';

const FeatureStoreEntitiesListView = ({
  entities,
}: {
  entities: EntityList;
}): React.ReactElement => {
  console.log(entities);
  return <div>FeatureStoreEntitiesListView</div>;
};

export default FeatureStoreEntitiesListView;
