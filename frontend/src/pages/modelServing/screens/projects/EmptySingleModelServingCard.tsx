import * as React from 'react';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import { ServingRuntimePlatform } from '~/types';
import EmptyComponentsCard from '~/pages/projects/screens/detail/EmptyComponentsCard';
import { ProjectsContext } from '~/concepts/projects/ProjectsContext';
import {
  getSortedTemplates,
  getTemplateEnabled,
  getTemplateEnabledForPlatform,
} from '~/pages/modelServing/customServingRuntimes/utils';
import ManageKServeModal from './kServeModal/ManageKServeModal';

type EmptySingleModelServingCardProps = {
  allowCreate: boolean;
};
const EmptySingleModelServingCard: React.FC<EmptySingleModelServingCardProps> = ({
  allowCreate,
}) => {
  const {
    dataConnections: { data: dataConnections },
  } = React.useContext(ProjectDetailsContext);
  const [open, setOpen] = React.useState(false);

  const {
    servingRuntimes: { refresh: refreshServingRuntime },
    servingRuntimeTemplates: { data: templates },
    servingRuntimeTemplateOrder: { data: templateOrder },
    servingRuntimeTemplateDisablement: { data: templateDisablement },
    serverSecrets: { refresh: refreshTokens },
    inferenceServices: { refresh: refreshInferenceServices },
    currentProject,
  } = React.useContext(ProjectDetailsContext);

  const { refresh: refreshAllProjects } = React.useContext(ProjectsContext);

  const onSubmit = (submit: boolean) => {
    if (submit) {
      refreshAllProjects();
      refreshServingRuntime();
      refreshInferenceServices();
      setTimeout(refreshTokens, 500); // need a timeout to wait for tokens creation
    }
  };

  const templatesSorted = getSortedTemplates(templates, templateOrder);
  const templatesEnabled = templatesSorted.filter((template) =>
    getTemplateEnabled(template, templateDisablement),
  );

  return (
    <>
      <EmptyComponentsCard
        title="Single model serving platform"
        description="Each model is deployed from its own model server. Choose this option when you have a small number of large models to deploy."
        allowCreate={allowCreate}
        onAction={() => setOpen(true)}
        createText="Add model server"
      />
      <ManageKServeModal
        isOpen={open}
        projectContext={{
          currentProject,
          dataConnections,
        }}
        servingRuntimeTemplates={templatesEnabled.filter((template) =>
          getTemplateEnabledForPlatform(template, ServingRuntimePlatform.SINGLE),
        )}
        onClose={(submit: boolean) => {
          onSubmit(submit);
          setOpen(false);
        }}
      />
    </>
  );
};

export default EmptySingleModelServingCard;
