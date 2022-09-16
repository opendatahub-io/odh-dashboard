import { useLocalStorage } from '../../../../components/localStorage';
import { CURRENT_BROWSER_TAB_PREFERENCE } from '../../const';

const useBrowserTabPreference = (): [boolean, (value: boolean) => boolean] => {
  const [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage] = useLocalStorage<boolean>(
    CURRENT_BROWSER_TAB_PREFERENCE,
    false,
  );

  return [isUsingCurrentTabFromStorage, setUsingCurrentTabFromStorage];
};

export default useBrowserTabPreference;
