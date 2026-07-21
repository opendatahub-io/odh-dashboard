import * as React from 'react';
import { DashboardStickyToolbar } from '@perses-dev/dashboards';

export type PersesVariablesProps = {
  /** Whether the variables toolbar should be sticky on scroll (default: false) */
  initialVariableIsSticky?: boolean;
};

/**
 * Renders the Perses variable selector controls.
 * Must be rendered inside a PersesProvider.
 */
const PersesVariables: React.FC<PersesVariablesProps> = (props) => (
  <DashboardStickyToolbar {...props} />
);

export default PersesVariables;
