import { AppState } from '../types';
import { UserState } from './types';
import { useAppSelector } from '../hooks';

const getUser = (state: AppState): UserState => ({
  username: state.user ?? '', // TODO: alternative?
  isAdmin: !!state.isAdmin,
  isAllowed: !!state.isAllowed,
  userLoading: state.userLoading,
  userError: state.userError ?? null,
});

export const useUser = (): UserState => useAppSelector(getUser);
