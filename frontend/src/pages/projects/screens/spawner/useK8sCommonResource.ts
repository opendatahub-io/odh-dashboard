import { useState } from 'react';
import { NameDescType } from '~/pages/projects/types';

export const useK8sCommonResource = (initialResource?: NameDescType) => {
  const [nameDesc, setNameDesc] = useState<NameDescType>({
    name: initialResource?.name ?? '',
    k8sName: {
      value: initialResource?.k8sName?.value ?? '',
      isUserInputK8sName: initialResource?.k8sName?.isUserInputK8sName ?? false,
      isTruncated: initialResource?.k8sName?.isTruncated ?? false,
    },
    description: initialResource?.description ?? '',
  });

  return { nameDesc, setNameDesc };
};
