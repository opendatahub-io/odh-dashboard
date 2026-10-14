import {
  ProjectSelectorNavigator as ProjectSelectorNavigatorFeature,
  type ProjectSelectorNavigatorProps,
} from '@odh-dashboard/autox-core/ui/components/feature';
import React from 'react';
import { fireAutoragProjectDropdownOptionSelected } from '~/app/utilities/tracking';

const ProjectSelectorNavigator = (props: ProjectSelectorNavigatorProps): React.JSX.Element => (
  <ProjectSelectorNavigatorFeature
    {...props}
    onProjectSelected={fireAutoragProjectDropdownOptionSelected}
  />
);

export default ProjectSelectorNavigator;
