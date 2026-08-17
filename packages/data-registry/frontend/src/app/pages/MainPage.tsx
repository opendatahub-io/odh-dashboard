import React from 'react';
import { Content } from '@patternfly/react-core';
import ApplicationsPage from '~/app/components/ApplicationsPage';

const MainPage: React.FC = () => (
  <ApplicationsPage
    title="Data Registry"
    description={<Content component="p">Data Registry standalone view</Content>}
    empty
    loaded
    provideChildrenPadding
    removeChildrenTopPadding
  />
);

export default MainPage;
