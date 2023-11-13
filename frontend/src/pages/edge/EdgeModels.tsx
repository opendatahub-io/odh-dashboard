import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import EmptyEdgeModels from './EmptyEdgeModels';

const EdgeModels: React.FC = () => (
  <ApplicationsPage
    title="Models"
    description={''}
    loaded={true}
    empty={true}
    emptyStatePage={<EmptyEdgeModels />}
  />
);

export default EdgeModels;
