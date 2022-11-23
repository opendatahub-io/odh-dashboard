import { useBrowserStorage } from '../../../../components/browserStorage';
import { CURRENT_BROWSER_TAB_PREFERENCE } from '../../const';

const useBrowserTabPreference = (): [boolean, (value: boolean) => boolean] => {
  const [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage] = useBrowserStorage<boolean>(
    CURRENT_BROWSER_TAB_PREFERENCE,
    false,
  );

  return [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage];
};

export default useBrowserTabPreference;
