import React from 'react';
import ApplicationsPage from '~/app/components/ApplicationsPage';

const MainPage: React.FC = () => (
  <ApplicationsPage
    title="Main Page"
    description={<p>Welcome to the Main Page</p>}
    empty
    loaded
    provideChildrenPadding
    removeChildrenTopPadding
  />
);

export default MainPage;
