import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { LastDeployed } from '@odh-dashboard/ui-core/components/LastDeployed';

type InferenceServiceLastDeployedProps = {
  inferenceService: InferenceServiceKind;
};

const InferenceServiceLastDeployed: React.FC<InferenceServiceLastDeployedProps> = ({
  inferenceService,
}) => <LastDeployed resource={inferenceService} />;

export default InferenceServiceLastDeployed;
