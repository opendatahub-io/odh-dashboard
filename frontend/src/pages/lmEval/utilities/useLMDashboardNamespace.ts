import { useAppSelector } from '~/redux/hooks';
import { isStateEqual } from '~/redux/selectors/utils';

export type LMDashboardNamespace = {
  dashboardNamespace: string;
};

export const useLMDashboardNamespace = (): LMDashboardNamespace =>
  useAppSelector((state) => ({ dashboardNamespace: state.dashboardNamespace || '' }), isStateEqual);
