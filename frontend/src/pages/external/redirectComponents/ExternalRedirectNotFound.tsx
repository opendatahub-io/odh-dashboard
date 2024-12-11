import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import RedirectErrorState from '~/pages/external/RedirectErrorState';

const ExternalRedirectNotFound: React.FC = () => (
  <ApplicationsPage
    loaded
    empty
    emptyStatePage={
      <RedirectErrorState
        title="Not Found"
        errorMessage="There is no external redirect for this URL"
        fallbackText="Go to home"
        fallbackUrl="/"
      />
    }
  />
);

export default ExternalRedirectNotFound;
