import {
  InvalidProject as InvalidProjectFeature,
  type InvalidProjectProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { fireAutoragProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const InvalidProject = (props: InvalidProjectProps): React.JSX.Element => (
  <InvalidProjectFeature
    {...props}
    emptyNamespaceText="The Project"
    onProjectSelected={fireAutoragProjectDropdownOptionSelected}
  />
);

export default InvalidProject;
