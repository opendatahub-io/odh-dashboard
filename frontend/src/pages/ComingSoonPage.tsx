import * as React from 'react';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import ApplicationsPage from '~/pages/ApplicationsPage';

type ComingSoonPageProps = {
  title: string;
  namespaced?: boolean;
  path?: string;
};

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, namespaced, path }) => (
  <ApplicationsPage
    loaded
    empty
    getRedirectPath={namespaced ? (ns) => `/projects/${ns}/${path}` : undefined}
    title={title}
    emptyStatePage={
      <EmptyDetailsView
        title="This page is coming soon."
        description="Not yet implemented"
        imageAlt="coming soon"
      />
    }
  />
);

export default ComingSoonPage;
