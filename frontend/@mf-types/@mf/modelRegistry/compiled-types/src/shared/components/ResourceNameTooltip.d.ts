import * as React from 'react';
import { K8sResourceCommon } from '~/shared/types';
import '~/shared/components/NotebookController.scss';
type ResourceNameTooltipProps = {
    resource: K8sResourceCommon;
    children: React.ReactNode;
    wrap?: boolean;
};
declare const ResourceNameTooltip: React.FC<ResourceNameTooltipProps>;
export default ResourceNameTooltip;
