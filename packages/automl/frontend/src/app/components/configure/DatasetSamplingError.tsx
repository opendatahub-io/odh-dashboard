import React from 'react';
import { Alert } from '@patternfly/react-core';

export default function DatasetSamplingError(): React.JSX.Element {
  return (
    <Alert variant="danger" isInline title="Unable to sample document data">
      An error occurred while sampling data from this document. Try again, or upload a different
      document.
    </Alert>
  );
}
