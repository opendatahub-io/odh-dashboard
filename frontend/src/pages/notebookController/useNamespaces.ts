import { useAppContext } from '../../app/AppContext';
import { useDashboardNamespace } from '../../redux/selectors';

const useNamespaces = (): { notebookNamespace: string; dashboardNamespace: string } => {
  const { dashboardConfig } = useAppContext();
  const { dashboardNamespace } = useDashboardNamespace();

  const notebookNamespace = dashboardConfig.spec.notebookController?.notebookNamespace;

  return { notebookNamespace: notebookNamespace || dashboardNamespace, dashboardNamespace };
};

export default useNamespaces;
