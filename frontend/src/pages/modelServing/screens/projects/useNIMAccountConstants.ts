import * as React from 'react';
import { fetchNIMAccountConstants } from '~/pages/modelServing/screens/projects/nimUtils';

type NIMAccountConstants = {
  nimSecretName: string;
  nimNGCSecretName: string;
  nimConfigMapName: string;
  templateName: string;
};

export const useNIMAccountConstants = (
  dashboardNamespace: string,
): NIMAccountConstants | undefined => {
  const [constants, setConstants] = React.useState<NIMAccountConstants>();

  React.useEffect(() => {
    const fetchConstants = async () => {
      const nimConstants = await fetchNIMAccountConstants(dashboardNamespace);
      setConstants(nimConstants);
    };

    fetchConstants();
  }, [dashboardNamespace]);

  return constants;
};
