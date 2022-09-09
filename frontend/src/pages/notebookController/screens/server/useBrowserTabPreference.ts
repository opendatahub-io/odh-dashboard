import * as React from 'react';
import { CURRENT_BROWSER_TAB_PREFERENCE } from '../../../../pages/notebookController/const';
import { useLocalStorage } from '../../../../utilities/useLocalStorage';

const useBrowserTabPreference = (): {
  isUsingCurrentTab: boolean;
  setUsingCurrentTab: (using: boolean) => void;
} => {
  const [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage] = useLocalStorage(
    CURRENT_BROWSER_TAB_PREFERENCE,
  );

  let isUsingCurrentTab: boolean;
  try {
    isUsingCurrentTab = isUsingCurrentTabFromStorage
      ? JSON.parse(isUsingCurrentTabFromStorage)
      : false;
  } catch (e) {
    console.error('Error parsing user current tab preference from local storage', e);
    isUsingCurrentTab = false;
  }

  const setUsingCurrentTab = React.useCallback(
    (using: boolean) => {
      let parsedUsing: string;
      try {
        parsedUsing = JSON.stringify(using);
      } catch (e) {
        console.error('Error stringify data when setting using current tab preference', e);
        parsedUsing = 'false';
      }
      setUsingCurrentTabFromStorage(parsedUsing);
    },
    [setUsingCurrentTabFromStorage],
  );

  return React.useMemo(
    () => ({ isUsingCurrentTab, setUsingCurrentTab }),
    [isUsingCurrentTab, setUsingCurrentTab],
  );
};

export default useBrowserTabPreference;
