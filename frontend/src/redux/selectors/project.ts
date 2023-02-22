import { useAppSelector } from '~/redux/hooks';
import { DashboardNamespace } from './types';

export const useDashboardNamespace = (): DashboardNamespace =>
  useAppSelector((state) => ({ dashboardNamespace: state.dashboardNamespace || '' }));
