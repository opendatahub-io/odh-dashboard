import * as React from 'react';
import EmptyDetailsView from '~/components/EmptyDetailsView';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';

type ComingSoonPageProps = {
  title: string;
  objectType?: ProjectObjectType;
};

const ComingSoonPage: React.FC<ComingSoonPageProps> = ({ title, objectType }) => (
  <ApplicationsPage
    loaded
    empty
    title={objectType ? <TitleWithIcon title={title} objectType={objectType} /> : title}
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
