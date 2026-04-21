import { Button } from '@patternfly/react-core';
import React from 'react';
import { Link } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import RedirectErrorState from '#~/pages/external/RedirectErrorState';

const ExternalRedirectNotFound: React.FC = () => {
  return (
    <ApplicationsPage
      loaded
      empty={false}
      loadError={new Error()}
      loadErrorPage={
        <RedirectErrorState
          title="Page not found"
          errorMessage="There is no external redirect for this URL."
          actions={
            <>
              <Button
                variant="link"
                component={(props: React.ComponentProps<'a'>) => <Link {...props} to="/" />}
              >
                Go to Home
              </Button>
            </>
          }
        />
      }
    />
  );
};

export default ExternalRedirectNotFound;
