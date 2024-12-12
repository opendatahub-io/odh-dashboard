import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import RedirectErrorState from '~/pages/external/RedirectErrorState';

const ExternalRedirectNotFound: React.FC = () => (
  <ApplicationsPage
    loaded
    empty
    emptyStatePage={
      <RedirectErrorState
        title="Page not found"
        errorMessage="There is no external redirect for this URL."
        fallbackText="Go to Home"
        fallbackUrl="/"
      />
    }
  />
);

export default ExternalRedirectNotFound;
