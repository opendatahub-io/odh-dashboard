import * as React from 'react';
import { useHistory, useParams } from 'react-router-dom';
import ApplicationsPage from 'pages/ApplicationsPage';
import {
  useGetUserStateFromDashboardConfig,
  usernameTranslate,
} from 'utilities/notebookControllerUtils';
import AppContext from '../../../../app/AppContext';
import { NotebookControllerContext } from '../../NotebookControllerContext';
import { useUser } from '../../../../redux/selectors';
import { NotebookControllerTabTypes } from '../../const';

const NotebookControlPanelRedirect: React.FC = () => {
  const history = useHistory();
  const { username: translatedUsername } = useParams<{ username: string }>();
  const { username: loggedInUser, isAdmin } = useUser();
  const translatedLoggedInUsername = usernameTranslate(loggedInUser);
  const { dashboardConfig } = React.useContext(AppContext);
  const getUserStateFromDashboardConfig = useGetUserStateFromDashboardConfig();
  const { setCurrentUserState, setImpersonatingUsername, setCurrentAdminTab } =
    React.useContext(NotebookControllerContext);

  React.useEffect(() => {
    if (
      translatedLoggedInUsername &&
      translatedUsername &&
      dashboardConfig.spec.notebookController?.enabled
    ) {
      const notActiveUser = translatedLoggedInUsername !== translatedUsername;
      if (notActiveUser) {
        if (isAdmin) {
          setImpersonatingUsername(translatedUsername);
          setCurrentAdminTab(NotebookControllerTabTypes.ADMIN);
          history.replace('/notebookController');
          return;
        }

        // Invalid state -- cannot view others notebook as not admin
        history.push('/not-found');
        return;
      }

      // Logged in user
      const userState = getUserStateFromDashboardConfig(translatedUsername);
      if (!userState) {
        history.push('/not-found');
        return;
      }

      setCurrentUserState(userState);
      history.replace('/notebookController');
    }
  }, [
    translatedUsername,
    dashboardConfig,
    history,
    setCurrentUserState,
    getUserStateFromDashboardConfig,
    translatedLoggedInUsername,
    isAdmin,
    setImpersonatingUsername,
    setCurrentAdminTab,
  ]);
  return (
    <ApplicationsPage title="Redirecting..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookControlPanelRedirect;
