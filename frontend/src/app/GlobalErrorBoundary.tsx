import React from 'react';
import {
  Button,
  Masthead,
  MastheadBrand,
  MastheadContent,
  MastheadMain,
  Page,
} from '@patternfly/react-core';
import ErrorBoundary from '#~/components/error/ErrorBoundary';
import { DASHBOARD_MAIN_CONTAINER_ID, ODH_PRODUCT_NAME } from '#~/utilities/const';

type GlobalErrorBoundaryProps = {
  children: React.ReactNode;
};

// Keep recovery independent of project context, feature navigation, and HeaderTools.
const RecoveryLayout: React.FC<GlobalErrorBoundaryProps> = ({ children }) => (
  <Page
    className="odh-dashboard"
    isContentFilled
    mainContainerId={DASHBOARD_MAIN_CONTAINER_ID}
    data-testid="app-error-fallback"
    masthead={
      <Masthead role="banner" aria-label="page masthead">
        <MastheadMain>
          <MastheadBrand>{ODH_PRODUCT_NAME || 'Dashboard'}</MastheadBrand>
        </MastheadMain>
        <MastheadContent>
          {/* Full-page navigation resets the failed tree instead of retaining the boundary state. */}
          <Button component="a" href="/" variant="link" data-testid="error-dashboard-link">
            Return to dashboard
          </Button>
        </MastheadContent>
      </Masthead>
    }
  >
    {children}
  </Page>
);

/** Recovery boundary for shared project providers and the application shell. */
const GlobalErrorBoundary: React.FC<GlobalErrorBoundaryProps> = ({ children }) => (
  <ErrorBoundary FallbackWrapper={RecoveryLayout}>{children}</ErrorBoundary>
);

export default GlobalErrorBoundary;
