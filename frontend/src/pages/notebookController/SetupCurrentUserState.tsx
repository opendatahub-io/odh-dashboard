import * as React from 'react';
import { NotebookControllerContext } from './NotebookControllerContext';
import ApplicationsPage from '../ApplicationsPage';
import {
  getUserStateFromDashboardConfig,
  usernameTranslate,
} from '../../utilities/notebookControllerUtils';
import { patchDashboardConfig } from '../../services/dashboardConfigService';
import AppContext from '../../app/AppContext';
import { useUser } from '../../redux/selectors';
import { EMPTY_USER_STATE } from './const';

const SetupCurrentUserState: React.FC = ({ children }) => {
  const { dashboardConfig } = React.useContext(AppContext);
  const { currentUserState, setCurrentUserState } = React.useContext(NotebookControllerContext);
  const { username } = useUser();

  React.useEffect(() => {
    if (!currentUserState.user) {
      // Load the user's current state for the NotebookController
      const translatedUsername = usernameTranslate(username);
      if (translatedUsername && dashboardConfig.spec.notebookController) {
        const notebookControllerState = dashboardConfig.status?.notebookControllerState || [];
        let fetchedUserState = getUserStateFromDashboardConfig(
          translatedUsername,
          notebookControllerState,
        );

        if (!fetchedUserState) {
          fetchedUserState = {
            ...EMPTY_USER_STATE,
            user: username,
          };
          const patch = {
            status: {
              notebookControllerState: [...notebookControllerState, fetchedUserState],
            },
          };
          patchDashboardConfig(patch).catch((e) => console.error(e));
        }

        setCurrentUserState(fetchedUserState);
      }
    }
  }, [dashboardConfig, currentUserState, setCurrentUserState, username]);

  if (!currentUserState.user) {
    return <ApplicationsPage title="Loading..." description={null} loaded={false} empty={false} />;
  }

  return <>{children}</>;
};

export default SetupCurrentUserState;
