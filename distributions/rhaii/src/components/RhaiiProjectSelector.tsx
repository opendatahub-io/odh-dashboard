import * as React from 'react';
import WorkingProjectSelector from '@odh-dashboard/ui-core/components/projectSelector/WorkingProjectSelector';

const RhaiiProjectSelector: React.FC = () => (
  <WorkingProjectSelector
    manualProjectMode
    emptyListContent="There are no projects in the namespace list."
  />
);

export default RhaiiProjectSelector;
