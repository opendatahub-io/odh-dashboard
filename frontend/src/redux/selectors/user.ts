import { AppState } from '#~/redux/types';
import { useAppSelector } from '#~/redux/hooks';
import { isStateEqual } from '#~/redux/selectors/utils';
import { UserState } from './types';

const getUser = (state: AppState): UserState => ({
  username: state.user ?? '', // TODO: alternative?
  userID: state.userID ?? '',
  isAdmin: !!state.isAdmin,
  isAllowed: !!state.isAllowed,
  userLoading: state.userLoading,
  userError: state.userError ?? null,
});

export const useUser = (): UserState => useAppSelector(getUser, isStateEqual);
