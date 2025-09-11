import React from 'react';
import { useNavigate } from 'react-router-dom';
import StartRunModal from '#~/pages/pipelines/global/modelCustomization/startRunModal/StartRunModal';
import { getModelCustomizationPath } from '#~/routes/pipelines/modelCustomization';

type LabTuneModalProps = {
  modelVersion: {
    id: string;
    name: string;
    registeredModelId: string;
  };
  onSubmit: (selectedProject: string) => void;
  onClose: () => void;
  loaded?: boolean;
  loadError?: Error | null;
};

const LabTuneModal: React.FC<LabTuneModalProps> = ({
  modelVersion,
  onSubmit,
  onClose,
  loaded = true,
  loadError = null,
}) => {
  const navigate = useNavigate();

  const handleSubmit = React.useCallback(
    (selectedProject: string) => {
      // Create tuning data for the selected model version
      const tuningData = {
        modelVersion,
        selectedProject,
      };

      // Navigate to the model customization path with the tuning data
      navigate(getModelCustomizationPath(selectedProject), { state: tuningData });

      // Call the original onSubmit callback
      onSubmit(selectedProject);

      // Close the modal
      onClose();
    },
    [navigate, modelVersion, onSubmit, onClose],
  );

  return (
    <StartRunModal
      onSubmit={handleSubmit}
      onCancel={onClose}
      loaded={loaded}
      loadError={loadError}
    />
  );
};

export default LabTuneModal;
