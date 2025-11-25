import React from 'react';
// TODO: Replace this import with the proper one in the dashboard main package.
import { ApplicationsPage } from '~/shared/components';

const SettingsMainPage: React.FC = () => {
  const loadError = undefined;
  const loaded = true;

  return (
    <ApplicationsPage
      title="Settings Page"
      description={<p>Welcome to the Settings Page</p>}
      empty
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    />
  );
};

export default SettingsMainPage;
