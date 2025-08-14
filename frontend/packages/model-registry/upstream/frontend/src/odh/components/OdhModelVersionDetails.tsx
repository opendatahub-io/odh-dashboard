import * as React from 'react';
import { MRDeploymentsContextProvider } from './MRDeploymentsContextProvider';
import { useParams } from 'react-router';
import { KnownLabels } from '~/odh/k8sTypes';

const OdhModelVersionDetails: React.FC<{
    element: React.ReactNode;
}> = ({
    element,
}) => {
  const { modelVersionId: mvId, registeredModelId: rmId } = useParams();
  const labelSelectors = React.useMemo(() => {
    if (!rmId || !mvId) {
      return undefined;
    }
    return {
      [KnownLabels.REGISTERED_MODEL_ID]: rmId,
      [KnownLabels.MODEL_VERSION_ID]: mvId,
    };
  }, [rmId, mvId]);
  
  return (
    <MRDeploymentsContextProvider labelSelectors={labelSelectors}>
      {element}
    </MRDeploymentsContextProvider>
  );
};

export default OdhModelVersionDetails;