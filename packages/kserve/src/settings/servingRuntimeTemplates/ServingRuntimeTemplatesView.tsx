import * as React from 'react';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import CustomServingRuntimeListView from './CustomServingRuntimeListView';
import EmptyCustomServingRuntime from './EmptyCustomServingRuntime';
import { CustomServingRuntimeContext } from './CustomServingRuntimeContext';

type ServingRuntimeTemplatesViewProps = {
  /**
   * Suppresses the page title when rendered as tab content — the tabbed page
   * already supplies a title and the tab label identifies the section.
   *
   * Only the standalone page (in frontend/src) shows the title. After
   * RHOAIENG-80077 removes that page the tab is the only caller, so this prop
   * can go and the title can be suppressed unconditionally.
   * https://issues.redhat.com/browse/RHOAIENG-80077
   */
  noTitle?: boolean;
};

const ServingRuntimeTemplatesView: React.FC<ServingRuntimeTemplatesViewProps> = ({ noTitle }) => {
  const {
    servingRuntimeTemplates: [servingRuntimeTemplates],
  } = React.useContext(CustomServingRuntimeContext);

  return (
    <ApplicationsPage
      title="Serving runtime templates"
      noTitle={noTitle}
      description="Manage your serving runtime templates. Enabled templates appear to deployers in the model serving wizard; out-of-the-box templates can be disabled but not deleted."
      loaded
      empty={servingRuntimeTemplates.length === 0}
      emptyStatePage={<EmptyCustomServingRuntime />}
      provideChildrenPadding
    >
      <CustomServingRuntimeListView />
    </ApplicationsPage>
  );
};

export default ServingRuntimeTemplatesView;
