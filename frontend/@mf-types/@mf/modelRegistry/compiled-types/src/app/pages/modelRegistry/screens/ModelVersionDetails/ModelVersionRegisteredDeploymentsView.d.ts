import React from 'react';
import ModelVersionDetailsTabs from '~/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
type ModelVersionRegisteredDeploymentsViewProps = Pick<React.ComponentProps<typeof ModelVersionDetailsTabs>, 'inferenceServices' | 'servingRuntimes' | 'refresh'>;
declare const ModelVersionRegisteredDeploymentsView: React.FC<ModelVersionRegisteredDeploymentsViewProps>;
export default ModelVersionRegisteredDeploymentsView;
