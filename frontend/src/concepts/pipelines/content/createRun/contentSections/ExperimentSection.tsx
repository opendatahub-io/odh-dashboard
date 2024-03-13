import * as React from 'react';
import { Button, FormGroup, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import ManageExperimentModal from '~/concepts/pipelines/content/experiment/ManageExperimentModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  CreateRunPageSections,
  runPageSectionTitles,
} from '~/concepts/pipelines/content/createRun/const';
import ExperimentSelector from '~/concepts/pipelines/content/experiment/ExperimentSelector';

type ExperimentSectionProps = {
  value: ExperimentKFv2 | null;
  onChange: (experiment: ExperimentKFv2) => void;
};

const ExperimentSection: React.FC<ExperimentSectionProps> = ({ value, onChange }) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [openCreate, setOpenCreate] = React.useState(false);
  return (
    <>
      <FormSection
        id={CreateRunPageSections.EXPERIMENT}
        title={runPageSectionTitles[CreateRunPageSections.EXPERIMENT]}
      >
        {/* `minWidth` a temp fix for PF issue https://github.com/patternfly/patternfly/issues/6062
      We can remove this after bumping to PF v5.2.0
    */}
        <FormGroup style={{ minWidth: 0 }}>
          <Stack hasGutter>
            <StackItem>
              <ExperimentSelector selection={value?.display_name} onSelect={onChange} />
            </StackItem>
            <StackItem>
              <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setOpenCreate(true)}>
                Create new experiment
              </Button>
            </StackItem>
          </Stack>
        </FormGroup>
      </FormSection>
      <ManageExperimentModal
        isOpen={openCreate}
        onClose={(experiment) => {
          if (experiment) {
            refreshAllAPI();
            onChange(experiment);
          }
          setOpenCreate(false);
        }}
      />
    </>
  );
};

export default ExperimentSection;
