import { AppState } from '~/redux/types';
import { useAppSelector } from '~/redux/hooks';
import { UserState } from './types';

const getUser = (state: AppState): UserState => ({
  username: state.user ?? '', // TODO: alternative?
  isAdmin: !!state.isAdmin,
  isAllowed: !!state.isAllowed,
  userLoading: state.userLoading,
  userError: state.userError ?? null,
});

export const useUser = (): UserState => useAppSelector(getUser);
