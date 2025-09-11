import * as React from 'react';
import { ProjectsContextType } from '@odh-dashboard/internal/concepts/projects/ProjectsContext';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { useAppContext } = require('@mf/host/AppContext');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { ProjectsContext } = require('@mf/host/ProjectsContext');

const ContextTest: React.FunctionComponent = () => {
  const appContext = useAppContext();
  const projectsContext: ProjectsContextType = React.useContext(ProjectsContext);

  return (
    <div>
      <h4>🧪 Host Context Test</h4>

      <div>📱 App Context: {appContext ? '✅' : '❌'}</div>
      <div>🔧 Workbench Namespace: {appContext.workbenchNamespace || '❓'}</div>
      <div>🏠 Dashboard Config: {appContext.dashboardConfig ? '✅' : '❌'}</div>
      <div>🏷️ Is RHOAI: {appContext.isRHOAI ? '✅' : '❌'}</div>
      <div>🔧 Build Statuses: {appContext.buildStatuses.length || 0}</div>
      <div>💾 Storage Classes: {appContext.storageClasses.length || 0}</div>
      <br />
      <div>📂 Projects Loaded: {projectsContext.loaded ? '✅' : '❌'}</div>
      <div>📊 Project Count: {projectsContext.projects.length || 0}</div>
      <div>📝 Preferred Project: {projectsContext.preferredProject?.metadata.name || '❓'}</div>
      <div>
        📋 Project Names:{' '}
        {projectsContext.projects
          .slice(0, 3)
          .map((p) => p.metadata.name)
          .join(', ') || '❓'}
        {projectsContext.projects.length > 3 ? '...' : ''}
      </div>
      <div>⚠️ Load Error: {projectsContext.loadError?.message || 'None'}</div>

      <div>🏷️ Model Serving Projects: {projectsContext.modelServingProjects.length || 0}</div>
      <div>🚫 Non-Active Projects: {projectsContext.nonActiveProjects.length || 0}</div>
    </div>
  );
};

export default ContextTest;
