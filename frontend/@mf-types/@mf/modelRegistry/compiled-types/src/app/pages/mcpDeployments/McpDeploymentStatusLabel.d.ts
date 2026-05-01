import * as React from 'react';
import { McpDeploymentPhase } from '~/app/mcpDeploymentTypes';
type McpDeploymentStatusLabelProps = {
    phase: McpDeploymentPhase;
};
declare const McpDeploymentStatusLabel: React.FC<McpDeploymentStatusLabelProps>;
export default McpDeploymentStatusLabel;
