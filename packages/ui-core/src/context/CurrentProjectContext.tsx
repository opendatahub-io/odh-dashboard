import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

export type CurrentProjectContextType = {
  currentProject: ProjectKind;
};

export const CurrentProjectContext = React.createContext<CurrentProjectContextType>({
  currentProject: { apiVersion: '', kind: '', metadata: { name: '' } },
});
