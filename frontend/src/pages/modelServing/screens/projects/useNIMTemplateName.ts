import * as React from 'react';
import { fetchNIMAccountTemplateName } from '#~/pages/modelServing/screens/projects/nimUtils';
import { useDashboardNamespace } from '#~/redux/selectors';

export const useNIMTemplateName = (): string | undefined => {
  const { dashboardNamespace } = useDashboardNamespace();
  const [templateName, setTemplateName] = React.useState<string>();

  React.useEffect(() => {
    const fetchTemplateName = async () => {
      const template = await fetchNIMAccountTemplateName(dashboardNamespace);
      setTemplateName(template);
    };

    fetchTemplateName();
  }, [dashboardNamespace]);

  return templateName;
};
