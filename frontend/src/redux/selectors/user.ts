import { State } from '../types';
import { UserState } from './types';
import { useSelector } from 'react-redux';

const getUser = (state: State): UserState => ({
  username: state.appState.user ?? '', // TODO: alternative?
  isAdmin: !!state.appState.isAdmin,
  isAllowed: !!state.appState.isAllowed,
  userLoading: state.appState.userLoading,
  userError: state.appState.userError ?? null,
});

export const useUser = (): UserState => useSelector<State, UserState>(getUser);
