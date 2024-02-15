import * as React from 'react';
import { Button, FormSection, Stack, StackItem } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import useExperiments from '~/concepts/pipelines/apiHooks/useExperiments';
import { ExperimentKFv2 } from '~/concepts/pipelines/kfTypes';
import ManageExperimentModal from '~/concepts/pipelines/content/experiment/ManageExperimentModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';

type ExperimentSectionProps = {
  value: ExperimentKFv2 | null;
  onChange: (experiment: ExperimentKFv2) => void;
};

const ExperimentSection: React.FC<ExperimentSectionProps> = ({ value, onChange }) => {
  const { refreshAllAPI } = usePipelinesAPI();
  const [{ items: experiments }] = useExperiments();
  const [openCreate, setOpenCreate] = React.useState(false);

  const changeRef = React.useRef<ExperimentSectionProps['onChange']>(onChange);
  changeRef.current = onChange;
  React.useEffect(() => {
    if (!value && experiments.length === 1) {
      changeRef.current(experiments[0]);
    }
  }, [value, experiments]);

  return (
    <>
      <FormSection
      // id={CreateRunPageSections.EXPERIMENT}
      // title={runPageSectionTitles[CreateRunPageSections.EXPERIMENT]}
      >
        <Stack hasGutter>
          <StackItem>
            <SimpleDropdownSelect
              placeholder="Select an experiment"
              options={experiments.map((e) => ({ key: e.experiment_id, label: e.display_name }))}
              value={value?.experiment_id ?? ''}
              onChange={(id) => {
                const experiment = experiments.find((p) => p.experiment_id === id);
                if (experiment) {
                  onChange(experiment);
                }
              }}
            />
          </StackItem>
          <StackItem>
            <Button variant="link" icon={<PlusCircleIcon />} onClick={() => setOpenCreate(true)}>
              Create new experiment
            </Button>
          </StackItem>
        </Stack>
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
