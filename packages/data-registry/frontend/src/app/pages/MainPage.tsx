import React from 'react';
import ApplicationsPage from '~/app/components/ApplicationsPage';

const MainPage: React.FC = () => (
  <ApplicationsPage
    title="Data Registry"
    description={<p>Data Registry standalone view</p>}
    empty
    loaded
    provideChildrenPadding
    removeChildrenTopPadding
  />
);

export default MainPage;
