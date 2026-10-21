import { useContext } from 'react';
import { AppContext, type AppUserSettings } from '~/app/context/AppContext';

const useUser = (): AppUserSettings => {
  const { user } = useContext(AppContext);
  return user;
};

export default useUser;
