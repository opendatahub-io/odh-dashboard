import { AnyAction } from 'redux';
import { TypedUseSelectorHook, createDispatchHook, createSelectorHook } from 'react-redux';
import { ThunkDispatch } from 'redux-thunk';
import { ReduxContext } from './context';
import { AppState } from './types';

// Use throughout your app instead of plain `useDispatch` and `useSelector`

export const useAppDispatch: () => ThunkDispatch<AppState, unknown, AnyAction> =
  createDispatchHook(ReduxContext);

export const useAppSelector: TypedUseSelectorHook<AppState> = createSelectorHook(ReduxContext);
