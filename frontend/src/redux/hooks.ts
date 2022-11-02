import { AnyAction } from 'redux';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { AppState } from './types';

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = (): ThunkDispatch<AppState, unknown, AnyAction> =>
  useDispatch<ThunkDispatch<AppState, unknown, AnyAction>>();
export const useAppSelector: TypedUseSelectorHook<AppState> = useSelector;
