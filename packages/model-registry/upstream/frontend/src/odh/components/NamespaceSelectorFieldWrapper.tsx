import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  isNamespaceSelectorExtension,
  type NamespaceSelectorFieldProps,
} from '~/odh/extension-points';
import NamespaceSelectorField from '~/concepts/k8s/NamespaceSelectorField/NamespaceSelectorField';

const NamespaceSelectorFieldWrapper: React.FC<NamespaceSelectorFieldProps> = (props) => {
  const [extensions, loaded] = useResolvedExtensions(isNamespaceSelectorExtension);

  if (loaded && extensions.length > 0) {
    const CustomField = extensions[0].properties.component.default;
    return <CustomField {...props} />;
  }

  return <NamespaceSelectorField {...props} />;
};

export default NamespaceSelectorFieldWrapper;
