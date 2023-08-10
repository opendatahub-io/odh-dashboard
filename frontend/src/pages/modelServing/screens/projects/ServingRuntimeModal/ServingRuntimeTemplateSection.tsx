import * as React from 'react';
import { FormGroup, Label, Split, SplitItem, StackItem, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { TemplateKind } from '~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithAccelerator } from '~/pages/projects/screens/spawner/spawnerUtils';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates: TemplateKind[];
  isEditing?: boolean;
};

const ServingRuntimeTemplateSection: React.FC<ServingRuntimeTemplateSectionProps> = ({
  data,
  setData,
  templates,
  isEditing,
}) => {
  const options = templates.map((template) => ({
    key: getServingRuntimeNameFromTemplate(template),
    selectedLabel: getServingRuntimeDisplayNameFromTemplate(template),
    label: (
      <Split>
        <SplitItem>{getServingRuntimeDisplayNameFromTemplate(template)}</SplitItem>
        <SplitItem isFilled />
        <SplitItem>
          {isCompatibleWithAccelerator(
            data.accelerator.accelerator?.spec.identifier,
            template.objects[0],
          ) && <Label color="blue">Compatible with accelerator</Label>}
        </SplitItem>
      </Split>
    ),
  }));

  return (
    <>
      <StackItem>
        <FormGroup label="Model server name" fieldId="serving-runtime-name-input" isRequired>
          <TextInput
            isRequired
            id="serving-runtime-name-input"
            value={data.name}
            onChange={(name) => setData('name', name)}
          />
        </FormGroup>
      </StackItem>
      <StackItem>
        <FormGroup label="Serving runtime" fieldId="serving-runtime-selection" isRequired>
          <SimpleDropdownSelect
            isFullWidth
            isDisabled={isEditing || templates.length === 0}
            id="serving-runtime-template-selection"
            aria-label="Select a template"
            options={options}
            placeholder={
              isEditing || templates.length === 0 ? data.servingRuntimeTemplateName : 'Select one'
            }
            value={data.servingRuntimeTemplateName ?? ''}
            onChange={(name) => {
              setData('servingRuntimeTemplateName', name);
            }}
          />
        </FormGroup>
      </StackItem>
    </>
  );
};

export default ServingRuntimeTemplateSection;
