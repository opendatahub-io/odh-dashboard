import { useBrowserStorage } from '@odh-dashboard/ui-core/utilities';
import { CURRENT_BROWSER_TAB_PREFERENCE } from '#~/pages/notebookController/const';

const useBrowserTabPreference = (): [boolean, (value: boolean) => boolean] => {
  const [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage] = useBrowserStorage<boolean>(
    CURRENT_BROWSER_TAB_PREFERENCE,
    false,
  );

  return [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage];
};

export default useBrowserTabPreference;
