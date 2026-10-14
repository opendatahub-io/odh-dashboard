import * as React from 'react';
import { McpDeploymentCondition } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentStatusLabelProps = {
    conditions: McpDeploymentCondition[];
};
declare const McpDeploymentStatusLabel: React.FC<McpDeploymentStatusLabelProps>;
export default McpDeploymentStatusLabel;
