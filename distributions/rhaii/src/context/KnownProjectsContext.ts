import * as React from 'react';
import type { ProjectKind } from '@odh-dashboard/k8s-core';

/**
 * Every project the RHAII provider knows, including names listed while
 * discovery was unavailable, which `ProjectsContext.projects` leaves out until
 * a lookup verifies them. The project selector reads it to classify every name
 * it offers.
 */
export const KnownProjectsContext = React.createContext<ProjectKind[]>([]);
