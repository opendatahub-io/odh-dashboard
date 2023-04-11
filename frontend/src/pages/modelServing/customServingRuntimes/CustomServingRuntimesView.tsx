import * as React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';

const CustomServingRuntimesView: React.FC = () => (
  <ApplicationsPage
    title="Serving runtimes"
    description="Manage model serving runtimes"
    loaded
    empty
    emptyStatePage={<EmptyCustomServingRuntime />}
    provideChildrenPadding
  ></ApplicationsPage>
);

export default CustomServingRuntimesView;
