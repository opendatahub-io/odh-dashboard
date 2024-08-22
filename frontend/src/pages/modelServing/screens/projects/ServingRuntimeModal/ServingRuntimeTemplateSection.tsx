import * as React from 'react';
import { FormGroup, Label, Split, SplitItem, Truncate } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { TemplateKind } from '~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  isServingRuntimeKind,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithAccelerator as isCompatibleWithAcceleratorProfile } from '~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect from '~/components/SimpleSelect';
import { AcceleratorProfileSelectFieldState } from '~/pages/notebookController/screens/server/AcceleratorProfileSelectField';

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates: TemplateKind[];
  isEditing?: boolean;
  selectedAcceleratorProfile: AcceleratorProfileSelectFieldState;
};

const ServingRuntimeTemplateSection: React.FC<ServingRuntimeTemplateSectionProps> = ({
  data,
  setData,
  templates,
  isEditing,
  selectedAcceleratorProfile,
}) => {
  const filteredTemplates = React.useMemo(
    () =>
      templates.filter((template) => {
        try {
          return isServingRuntimeKind(template.objects[0]);
        } catch (e) {
          return false;
        }
      }),
    [templates],
  );

  const options = filteredTemplates.map((template) => ({
    key: getServingRuntimeNameFromTemplate(template),
    label: getServingRuntimeDisplayNameFromTemplate(template),
    dropdownLabel: (
      <Split>
        <SplitItem>
          <Truncate content={getServingRuntimeDisplayNameFromTemplate(template)} />
        </SplitItem>
        <SplitItem isFilled />
        <SplitItem>
          {isCompatibleWithAcceleratorProfile(
            selectedAcceleratorProfile.profile?.spec.identifier,
            template.objects[0],
          ) && <Label color="blue">Compatible with accelerator</Label>}
        </SplitItem>
      </Split>
    ),
  }));

  return (
    <FormGroup label="Serving runtime" fieldId="serving-runtime-template-selection" isRequired>
      <SimpleSelect
        isFullWidth
        isDisabled={isEditing || filteredTemplates.length === 0}
        dataTestId="serving-runtime-template-selection"
        aria-label="Select a template"
        options={options}
        placeholder={
          isEditing || filteredTemplates.length === 0
            ? data.servingRuntimeTemplateName
            : 'Select one'
        }
        toggleProps={{ id: 'serving-runtime-template-selection' }}
        value={data.servingRuntimeTemplateName}
        onChange={(name) => {
          setData('servingRuntimeTemplateName', name);
        }}
      />
    </FormGroup>
  );
};

export default ServingRuntimeTemplateSection;
