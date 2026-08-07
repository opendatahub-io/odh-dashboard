import * as React from 'react';
import type { HardwareProfileKind } from '@odh-dashboard/k8s-core';

export type ProjectHardwareProfilesContextType = {
  projectHardwareProfiles: [HardwareProfileKind[], boolean, Error | undefined];
};

export const ProjectHardwareProfilesContext =
  React.createContext<ProjectHardwareProfilesContextType>({
    projectHardwareProfiles: [[], false, undefined],
  });
