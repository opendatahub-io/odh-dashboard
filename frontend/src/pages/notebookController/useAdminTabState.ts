import * as React from 'react';
import { NotebookControllerTabTypes } from './const';
import { useUser } from '../../redux/selectors';

export type SetCurrentAdminTab = (newTab: NotebookControllerTabTypes) => void;

const useAdminTabState = (): [
  adminTab: NotebookControllerTabTypes,
  setCurrentAdminTab: SetCurrentAdminTab,
] => {
  const [currentTab, setCurrentTab] = React.useState(NotebookControllerTabTypes.SERVER);
  const { isAdmin } = useUser();
  const setCurrentAdminTab = React.useCallback(
    (newTab: NotebookControllerTabTypes) => {
      if (!isAdmin) return; // cannot change tab as a non-admin

      setCurrentTab(newTab);
    },
    [isAdmin],
  );

  return [currentTab, setCurrentAdminTab];
};

export default useAdminTabState;
