import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useExplainabilityModelData } from '~/concepts/explainability/useExplainabilityModelData';
import { InferenceServiceKind } from '~/k8sTypes';
import ManageBiasConfigurationModal from '~/pages/modelServing/screens/metrics/bias/biasConfigurationModal/ManageBiasConfigurationModal';

type BiasConfigurationButtonProps = {
  inferenceService: InferenceServiceKind;
};

const BiasConfigurationButton: React.FC<BiasConfigurationButtonProps> = ({ inferenceService }) => {
  const [isOpen, setOpen] = React.useState(false);
  const { biasMetricConfigs, loaded, refresh } = useExplainabilityModelData();

  React.useEffect(() => {
    if (loaded && biasMetricConfigs.length === 0) {
      setOpen(true);
    }
  }, [loaded, biasMetricConfigs]);

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="secondary">
        Configure metric
      </Button>
      <ManageBiasConfigurationModal
        isOpen={isOpen}
        onClose={(submit) => {
          if (submit) {
            refresh();
          }
          setOpen(false);
        }}
        inferenceService={inferenceService}
      />
    </>
  );
};

export default BiasConfigurationButton;
