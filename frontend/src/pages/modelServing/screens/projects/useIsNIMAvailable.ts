import { useEffect, useState } from 'react';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';
import { isNIMServingRuntimeTemplateAvailable } from '~/pages/modelServing/screens/projects/nimUtils';

export const useIsNIMAvailable = (dashboardNamespace: string): boolean => {
  const [isNIMAvailable, setIsNIMAvailable] = useState<boolean>(false);
  const isNIMModelServingAvailable = useIsAreaAvailable(SupportedArea.NIM_MODEL).status;

  useEffect(() => {
    const checkNIMServingRuntime = async () => {
      const isNIMRuntimeAvailable = await isNIMServingRuntimeTemplateAvailable(dashboardNamespace);
      setIsNIMAvailable(isNIMModelServingAvailable && isNIMRuntimeAvailable);
    };

    checkNIMServingRuntime();
  }, [isNIMModelServingAvailable, dashboardNamespace]);

  return isNIMAvailable;
};
