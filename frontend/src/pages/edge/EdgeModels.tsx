import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { EdgeContext } from '~/concepts/edge/EdgeContext';
import EmptyEdgeModels from './EmptyEdgeModels';

const EdgeModels: React.FC = () => {
  const { models } = React.useContext(EdgeContext);
  return (
    <ApplicationsPage
      title="Models"
      loaded={models.loaded}
      empty={models.data.length === 0}
      emptyStatePage={<EmptyEdgeModels />}
    />
  );
};

export default EdgeModels;
