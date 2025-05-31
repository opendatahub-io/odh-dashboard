import { Notebook } from '#~/types';
import { SetImpersonating } from './useImpersonationForContext';
import { NotebookControllerTabTypes } from './const';
import { SetCurrentAdminTab } from './useAdminTabState';

export type NotebookControllerContextProps = {
  /** Current user's notebook -- set internally */
  currentUserNotebook: Notebook | null;
  /**
   * Requests the notebook be re-fetched now instead of waiting for polling intervals.
   * The provided speed will change the cadence future fetches are done at. Omit to reset.
   */
  requestNotebookRefresh: (changeSpeed?: number) => void;
  /** Status on if the current notebook is in a state we can consider it running */
  currentUserNotebookIsRunning: boolean;
  /** The current pod associated with the running Notebook - empty string if not running -- assumes 1 pod */
  currentUserNotebookPodUID: string;
  /** The current link of the Notebook */
  currentUserNotebookLink: string;

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
  currentPodUID: string;
  currentLink: string;
  requestRefresh: NotebookControllerContextProps['requestNotebookRefresh'];
  former: Omit<NotebookContextStorage, 'former'> | null;
};

export type SetNotebookState = (
  useStateUpdateFunc: (prevState: NotebookContextStorage) => NotebookContextStorage,
) => void;
