import React from 'react';
import ApplicationsPage from '~/app/components/ApplicationsPage';

const MainPage: React.FC = () => (
  <ApplicationsPage
    title="AI Safety Studio"
    emptyMessage="No AI Safety Studio features available"
    empty
    loaded
    provideChildrenPadding
    removeChildrenTopPadding
  />
);

export default MainPage;
