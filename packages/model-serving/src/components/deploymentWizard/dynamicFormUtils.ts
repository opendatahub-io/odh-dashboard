import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type { RecursivePartial } from '@odh-dashboard/internal/typeHelpers';
import type { DeploymentWizardField, WizardFormData } from './types';
import { isDeploymentWizardFieldExtension } from '../../../extension-points';

// Implementation
export const useWizardFieldFromExtension = <T extends DeploymentWizardField>(
  predicate: (field: DeploymentWizardField) => field is T,
  formData: RecursivePartial<WizardFormData['state']>,
): T | undefined => {
  const [extensions] = useResolvedExtensions(isDeploymentWizardFieldExtension);

  const fields = React.useMemo(() => {
    const all = extensions.map((ext) => ext.properties.field);
    return all.filter(predicate).filter((field) => field.isActive(formData));
  }, [extensions, predicate, formData]);

  return React.useMemo(() => fields[0], [fields]);
};
