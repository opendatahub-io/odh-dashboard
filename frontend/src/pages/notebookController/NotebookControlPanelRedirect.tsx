import * as React from 'react';
import { useParams, useHistory } from 'react-router-dom';
import ApplicationsPage from 'pages/ApplicationsPage';
import { getUserStateFromDashboardConfig } from 'utilities/notebookControllerUtils';
import AppContext from '../../app/AppContext';
import NotebookControllerContext from './NotebookControllerContext';

const NotebookControlPanelRedirect: React.FC = () => {
  const history = useHistory();
  const { username: translatedUsername } = useParams<{ username: string }>();
  const { dashboardConfig } = React.useContext(AppContext);
  const { setCurrentUserState } = React.useContext(NotebookControllerContext);
  React.useEffect(() => {
    if (translatedUsername && dashboardConfig.spec.notebookController?.enabled) {
      const userState = getUserStateFromDashboardConfig(
        translatedUsername,
        dashboardConfig.status?.notebookControllerState || [],
      );
      if (!userState) {
        history.push('/not-found');
      } else {
        setCurrentUserState(userState);
        history.replace('/notebookController');
      }
    }
  }, [translatedUsername, dashboardConfig, history, setCurrentUserState]);
  return (
    <ApplicationsPage title="Redirecting..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookControlPanelRedirect;
