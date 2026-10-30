import {
  InvalidProject as InvalidProjectFeature,
  type InvalidProjectProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { fireAutomlProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const InvalidProject = (props: InvalidProjectProps): React.JSX.Element => (
  <InvalidProjectFeature {...props} onProjectSelected={fireAutomlProjectDropdownOptionSelected} />
);

export default InvalidProject;
