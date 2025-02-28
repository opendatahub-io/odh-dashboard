import * as React from 'react';
import {
  FormGroup,
  Stack,
  StackItem,
  ExpandableSection,
  Popover,
  Button,
} from '@patternfly/react-core';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { HardwareProfileKind } from '~/k8sTypes';
import { useValidation, ValidationContext } from '~/utilities/useValidation';
import { ContainerResources } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { HardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import HardwareProfileCustomize from '~/concepts/hardwareProfiles/HardwareProfileCustomize';
import { createIlabHardwareProfileValidationSchema } from '~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import TrainingHardwareProfileSelect from './TrainingHardwareSelect';

type TrainingHardwareProfileFormSectionProps = {
  data: HardwareProfileConfig;
  setData: UpdateObjectAtPropAndValue<HardwareProfileConfig>;
};

const TrainingHardwareProfileFormSection: React.FC<TrainingHardwareProfileFormSectionProps> = ({
  data,
  setData,
}) => {
  const validationSchema = React.useMemo(
    () => createIlabHardwareProfileValidationSchema(data.selectedProfile),
    [data.selectedProfile],
  );

  const validation = useValidation(data, validationSchema);
  const hasValidationErrors = Object.keys(validation.getAllValidationIssues()).length > 0;

  const [isExpanded, setIsExpanded] = React.useState(hasValidationErrors);

  const onProfileSelect = (profile?: HardwareProfileKind) => {
    if (profile) {
      const emptyRecord: Record<string, string | number> = {};

      const newRequests =
        profile.spec.identifiers?.reduce(
          (acc: Record<string, string | number>, identifier) => {
            acc[identifier.identifier] = identifier.defaultCount;
            return acc;
          },
          { ...emptyRecord },
        ) ?? emptyRecord;

      setData('selectedProfile', profile);
      setData('resources', {
        ...data.resources,
        requests: newRequests,
      });
    }
  };

  return (
    <ValidationContext.Provider value={validation}>
      <Stack hasGutter data-testid="hardware-profile-section">
        <StackItem>
          <FormGroup label="Training hardware profile" isRequired>
            <TrainingHardwareProfileSelect
              hardwareProfileConfig={data}
              onChange={onProfileSelect}
            />
          </FormGroup>
        </StackItem>
        <StackItem>
          <Popover
            hasAutoWidth
            bodyContent="This list includes only the hardware profiles that have GPU defined."
          >
            <Button
              variant="link"
              icon={<OutlinedQuestionCircleIcon />}
              data-testid="hardware-profile-details-popover"
            >
              Not seeing what you&apos;re looking for?
            </Button>
          </Popover>
        </StackItem>
        {data.selectedProfile?.spec.identifiers &&
          data.selectedProfile.spec.identifiers.length > 0 && (
            <StackItem>
              <ExpandableSection
                isIndented
                toggleText="Customize resource requests and limits"
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
                data-testid="hardware-profile-customize"
              >
                <HardwareProfileCustomize
                  onlyShowLimit
                  identifiers={data.selectedProfile.spec.identifiers}
                  data={data.resources}
                  setData={(newData: ContainerResources) => setData('resources', newData)}
                />
              </ExpandableSection>
            </StackItem>
          )}
      </Stack>
    </ValidationContext.Provider>
  );
};

export default TrainingHardwareProfileFormSection;
