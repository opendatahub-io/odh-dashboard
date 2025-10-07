import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { usernameTranslate, useCheckJupyterEnabled } from '#~/utilities/notebookControllerUtils';
import { NotebookControllerContext } from '#~/pages/notebookController/NotebookControllerContext';
import { useUser } from '#~/redux/selectors';
import { NotebookControllerTabTypes } from '#~/pages/notebookController/const';

const NotebookControlPanelRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { username: translatedUsername } = useParams<{ username: string }>();
  const { username: loggedInUser, isAdmin } = useUser();
  const translatedLoggedInUsername = usernameTranslate(loggedInUser);
  const { setImpersonating, setCurrentAdminTab } = React.useContext(NotebookControllerContext);
  const isJupyterEnabled = useCheckJupyterEnabled();

  React.useEffect(() => {
    if (translatedLoggedInUsername && translatedUsername && isJupyterEnabled) {
      const notActiveUser = translatedLoggedInUsername !== translatedUsername;
      if (notActiveUser) {
        if (isAdmin) {
          // TODO: we need to worry about this case -- how to manage it?
          // setImpersonating(undefined, translatedUsername);
          setCurrentAdminTab(NotebookControllerTabTypes.ADMIN);
          navigate('/notebook-controller', { replace: true });
          return;
        }

        // Invalid state -- cannot view others notebook as not admin
        navigate('/not-found');
        return;
      }

      // Logged in user -- just redirect and it will load the state normally
      navigate('/notebook-controller', { replace: true });
    }
  }, [
    translatedUsername,
    isJupyterEnabled,
    navigate,
    translatedLoggedInUsername,
    isAdmin,
    setImpersonating,
    setCurrentAdminTab,
  ]);
  return (
    <ApplicationsPage title="Redirecting..." description={null} loaded={false} empty={false} />
  );
};

export default NotebookControlPanelRedirect;
