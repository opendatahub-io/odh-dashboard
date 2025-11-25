import React from 'react';
// TODO: Replace this import with the proper one in the dashboard main package.
import { ApplicationsPage } from '~/shared/components';

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
