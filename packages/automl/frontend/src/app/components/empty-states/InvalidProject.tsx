import { useTrackEvent } from '@odh-dashboard/analytics/react';
import {
  InvalidProject as InvalidProjectFeature,
  type InvalidProjectProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { fireAutomlProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const InvalidProject = (props: InvalidProjectProps): React.JSX.Element => {
  const trackEvent = useTrackEvent();

  return (
    <InvalidProjectFeature
      {...props}
      onProjectSelected={(projectName) =>
        fireAutomlProjectDropdownOptionSelected(trackEvent, projectName)
      }
    />
  );
};

export default InvalidProject;
