import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const MainPage: React.FC = () => {
  const loadError = undefined;
  const loaded = true;

  return (
    <ApplicationsPage
      title="Main Page"
      description={<p>Welcome to the Main Page</p>}
      empty
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    />
  );
};

export default MainPage;
