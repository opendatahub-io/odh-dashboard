import { UserSettings } from 'mod-arch-core';
import { useAppContext } from '~/app/context/AppContext';

const useUser = (): UserSettings => {
  const { user } = useAppContext();
  return user;
};

export default useUser;
