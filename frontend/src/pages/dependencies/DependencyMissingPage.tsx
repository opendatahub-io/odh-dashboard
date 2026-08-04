import * as React from 'react';
import { useParams } from 'react-router-dom';
import NotFound from '@odh-dashboard/ui-core/components/NotFound';

const DependencyMissingPage: React.FC = () => {
  const { area } = useParams();

  switch (area) {
    // TODO: add more use-cases
    default:
      // eslint-disable-next-line no-console
      console.error('Unknown area of the dependency missing screen', area);
  }

  return <NotFound />;
};

export default DependencyMissingPage;
