import { useAppContext } from '#~/app/AppContext';
import { useDashboardNamespace } from '#~/redux/selectors';

const useNamespaces = (): {
  workbenchNamespace: string;
  dashboardNamespace: string;
} => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { workbenchNamespace } = useAppContext();

  return { workbenchNamespace: workbenchNamespace || dashboardNamespace, dashboardNamespace };
};

export default useNamespaces;
