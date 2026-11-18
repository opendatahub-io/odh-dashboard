import {
  InvalidProject as InvalidProjectFeature,
  type InvalidProjectProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { useTrackEvent } from '@odh-dashboard/analytics/react';
import { fireAutoragProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const InvalidProject = (props: InvalidProjectProps): React.JSX.Element => {
  const trackEvent = useTrackEvent();
  return (
    <InvalidProjectFeature
      {...props}
      emptyNamespaceText="The Project"
      onProjectSelected={(projectName) =>
        fireAutoragProjectDropdownOptionSelected(trackEvent, projectName)
      }
    />
  );
};

export default InvalidProject;
