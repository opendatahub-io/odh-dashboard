import { useAppSelector } from '#~/redux/hooks';
import { isStateEqual } from '#~/redux/selectors/utils';
import { DashboardNamespace } from './types';

export const useDashboardNamespace = (): DashboardNamespace =>
  useAppSelector((state) => ({ dashboardNamespace: state.dashboardNamespace || '' }), isStateEqual);
