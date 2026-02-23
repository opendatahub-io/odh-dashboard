import * as React from 'react';
import { PageSection } from '@patternfly/react-core';
import { useRouteError } from 'react-router-dom';
import ErrorDetails from './ErrorDetails';
import ErrorFallbackLayout from './ErrorFallbackLayout';
import { getRouteErrorDetails, isChunkLoadError } from './routeErrorUtils';
import UpdateState from './UpdateState';

const RouteErrorElement: React.FC = () => {
  const error = useRouteError();
  const [showErrorDetails, setShowErrorDetails] = React.useState(false);
  const { title, errorMessage, stack } = getRouteErrorDetails(error);

  if (isChunkLoadError(error) && !showErrorDetails) {
    return <UpdateState onClose={() => setShowErrorDetails(true)} />;
  }

  return (
    <PageSection
      hasBodyWrapper={false}
      className="pf-v6-u-p-lg"
      data-testid="router-error-boundary"
    >
      <ErrorFallbackLayout reloadButtonTestId="router-reload-link">
        <ErrorDetails title={title} errorMessage={errorMessage} stack={stack} />
      </ErrorFallbackLayout>
    </PageSection>
  );
};

export default RouteErrorElement;
