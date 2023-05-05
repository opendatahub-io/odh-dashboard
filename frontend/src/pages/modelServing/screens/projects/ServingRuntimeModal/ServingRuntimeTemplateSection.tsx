import * as React from 'react';
import { FormGroup, Select, SelectOption, StackItem, TextInput } from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { TemplateKind } from '~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from '~/pages/modelServing/customServingRuntimes/utils';

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates?: TemplateKind[];
  isEditing?: boolean;
};

const ServingRuntimeTemplateSection: React.FC<ServingRuntimeTemplateSectionProps> = ({
  data,
  setData,
  templates,
  isEditing,
}) => {
  const [isOpen, setOpen] = React.useState(false);

  const templatesUsed = isEditing ? [] : templates;

  if (!templatesUsed) {
    return null;
  }

  const options = templatesUsed.map((template) => (
    <SelectOption
      key={getServingRuntimeNameFromTemplate(template)}
      value={getServingRuntimeNameFromTemplate(template)}
    >
      {getServingRuntimeDisplayNameFromTemplate(template)}
    </SelectOption>
  ));

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
          <Select
            removeFindDomNode
            selections={data.servingRuntimeTemplateName}
            isOpen={isOpen}
            onSelect={(e, selection) => {
              if (typeof selection === 'string') {
                setData('servingRuntimeTemplateName', selection);
                setOpen(false);
              }
            }}
            isDisabled={isEditing || templatesUsed.length === 0}
            onToggle={setOpen}
            placeholderText="Select one"
          >
            {options}
          </Select>
        </FormGroup>
      </StackItem>
    </>
  );
};

export default ServingRuntimeTemplateSection;
