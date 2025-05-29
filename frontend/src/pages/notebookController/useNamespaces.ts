import { useAppContext } from '#~/app/AppContext';
import { useDashboardNamespace } from '#~/redux/selectors';

const useNamespaces = (): {
  /** @deprecated - all new functionality should use project creation under DSG */
  notebookNamespace: string;
  dashboardNamespace: string;
} => {
  const { dashboardConfig } = useAppContext();
  const { dashboardNamespace } = useDashboardNamespace();

  /** @deprecated */
  const notebookNamespace = dashboardConfig.spec.notebookController?.notebookNamespace;

  return { notebookNamespace: notebookNamespace || dashboardNamespace, dashboardNamespace };
};

export default useNamespaces;
