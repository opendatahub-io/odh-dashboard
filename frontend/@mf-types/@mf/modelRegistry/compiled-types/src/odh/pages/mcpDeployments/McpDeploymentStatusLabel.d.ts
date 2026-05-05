import * as React from 'react';
import { McpDeploymentPhase } from '~/odh/types/mcpDeploymentTypes';
type McpDeploymentStatusLabelProps = {
    phase: McpDeploymentPhase;
};
declare const McpDeploymentStatusLabel: React.FC<McpDeploymentStatusLabelProps>;
export default McpDeploymentStatusLabel;
