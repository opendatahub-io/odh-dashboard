import * as React from 'react';
import ProjectSelector from '@odh-dashboard/internal/concepts/projects/ProjectSelector';
type EvalHubProjectSelectorProps = {
    namespace?: string;
    getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ProjectSelector>, 'onSelection' | 'namespace'>;
declare const EvalHubProjectSelector: React.FC<EvalHubProjectSelectorProps>;
export default EvalHubProjectSelector;
