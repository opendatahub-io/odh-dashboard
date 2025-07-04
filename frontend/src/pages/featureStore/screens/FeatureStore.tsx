import * as React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';

const description = `Manage Feature Store`;

const FeatureStore: React.FC = () => (
  <ApplicationsPage
    description={description}
    empty={false}
    errorMessage="Unable to load feature store."
    loaded
    provideChildrenPadding
    title={<TitleWithIcon title="Feature Store" objectType={ProjectObjectType.featureStore} />}
  >
    This is a feature store page
  </ApplicationsPage>
);

export default FeatureStore;
