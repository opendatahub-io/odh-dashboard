import React from 'react';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';

const MainPage: React.FC = () => {
  const loadError = undefined;
  const loaded = true;

  return (
    <ApplicationsPage
      title="AutoRAG"
      description={
        <p>Automatically configure and optimize your Retrieval-Augmented Generation workflows.</p>
      }
      empty
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    />
  );
};

export default MainPage;
