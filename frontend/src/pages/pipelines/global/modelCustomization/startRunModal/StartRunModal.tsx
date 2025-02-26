import * as React from 'react';
import { PipelineContextProvider } from '~/concepts/pipelines/context';
import StartRunModalWrapper from '~/pages/pipelines/global/modelCustomization/startRunModal/StartRunModalWrapper';

export type StartRunModalProps = {
  onSubmit: (selectedProject: string) => void;
  onCancel: () => void;
};

const StartRunModal: React.FC<StartRunModalProps> = ({ onSubmit, onCancel }) => {
  const [selectedProject, setSelectedProject] = React.useState<string | null>(null);

  const modalWrapper = (
    <StartRunModalWrapper
      onSubmit={onSubmit}
      onCancel={onCancel}
      selectedProject={selectedProject}
      setSelectedProject={setSelectedProject}
    />
  );

  return selectedProject ? (
    <PipelineContextProvider key={selectedProject} namespace={selectedProject}>
      {modalWrapper}
    </PipelineContextProvider>
  ) : (
    modalWrapper
  );
};

export default StartRunModal;
