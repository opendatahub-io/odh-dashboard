import * as React from 'react';
import { fetchNIMAccountConstants } from '~/pages/modelServing/screens/projects/nimUtils';

type NIMAccountConstants =
  | {
      nimSecretName: string;
      nimNGCSecretName: string;
      nimConfigMapName: string;
      templateName: string;
    }
  | undefined;

export const useNIMAccountConstants = (dashboardNamespace: string): NIMAccountConstants => {
  const [constants, setConstants] = React.useState<NIMAccountConstants>(undefined);

  React.useEffect(() => {
    const fetchConstants = async () => {
      const nimConstants = await fetchNIMAccountConstants(dashboardNamespace);
      setConstants(nimConstants);
    };

    fetchConstants();
  }, [dashboardNamespace]);

  return constants;
};
