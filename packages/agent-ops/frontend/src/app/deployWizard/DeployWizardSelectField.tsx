import * as React from 'react';
import './DeployWizardSelectField.scss';

/** Wrap wizard dropdowns (ProjectSelector, SimpleSelect) for consistent toggle width. */
const DeployWizardSelectField: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="deploy-agent-wizard-dropdown">{children}</div>
);

export default DeployWizardSelectField;
