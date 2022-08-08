import { useSelector } from 'react-redux';
import { State } from '../types';
import { DashboardNamespace } from './types';

const getNamespace = (state: State): DashboardNamespace => ({
  dashboardNamespace: state.appState.dashboardNamespace || '',
});

export const useDashboardNamespace = (): DashboardNamespace =>
  useSelector<State, DashboardNamespace>(getNamespace);
