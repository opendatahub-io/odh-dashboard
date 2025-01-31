import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import EnabledApplicationsList from '~/pages/enabledApplications/EnabledApplicationsList';

const description = `Launch your enabled applications, view documentation, or get started with quick start instructions and tasks.`;

export const EnabledApplications: React.FC = () => (
  <ApplicationsPage
    title={<TitleWithIcon title="Enabled" objectType={ProjectObjectType.enabledApplications} />}
    description={description}
    loaded
    empty={false}
  >
    <EnabledApplicationsList />
  </ApplicationsPage>
);
export default EnabledApplications;
