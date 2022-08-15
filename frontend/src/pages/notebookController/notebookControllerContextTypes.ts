import { Notebook } from '../../types';
import { SetImpersonating } from './useImpersonationForContext';
import { NotebookControllerTabTypes } from './const';
import { SetCurrentAdminTab } from './useAdminTabState';

export type NotebookControllerContextProps = {
  /** Current user's notebook -- set internally */
  currentUserNotebook: Notebook | null;
  /** Requests the notebook be re-fetched now instead of waiting for polling intervals */
  requestNotebookRefresh: () => void;
  /** Status on if the current notebook is in a state we can consider it running */
  currentUserNotebookIsRunning: boolean;

  /**
   * Setup impersonating against a user's notebook & username (need both, see below)
   * @param impersonateNotebook - The notebook of the user (null if they have none)
   * @param impersonateUsername - The username behind the notebook (especially for the case of null impersonateNotebook)
   */
  setImpersonating: SetImpersonating;
  /** The user that is impersonated -- null is no impersonation */
  impersonatedUsername: string | null;

  /* Navigate admin tabs */
  setCurrentAdminTab: SetCurrentAdminTab;
  currentTab: NotebookControllerTabTypes;
};

export type NotebookContextStorage = {
  /**
   * Intentional state:
   *  - undefined -- not set yet (ie *we* need to load)
   *  - null -- set with no backing notebook
   *  - Notebook -- an existing notebook
   */
  current: Notebook | null | undefined;
  currentIsRunning: boolean;
  requestRefresh: NotebookControllerContextProps['requestNotebookRefresh'];
  former: Omit<NotebookContextStorage, 'former'> | null;
};

export type SetNotebookState = (
  useStateUpdateFunc: (prevState: NotebookContextStorage) => NotebookContextStorage,
) => void;
