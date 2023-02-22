import { AppState } from '~/redux/types';
import { UserState } from './types';
import { useAppSelector } from '~/redux/hooks';

const getUser = (state: AppState): UserState => ({
  username: state.user ?? '', // TODO: alternative?
  isAdmin: !!state.isAdmin,
  isAllowed: !!state.isAllowed,
  userLoading: state.userLoading,
  userError: state.userError ?? null,
});

export const useUser = (): UserState => useAppSelector(getUser);
