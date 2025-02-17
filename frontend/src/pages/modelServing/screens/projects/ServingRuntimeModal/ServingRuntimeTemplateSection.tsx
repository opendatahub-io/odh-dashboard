import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Label,
  Split,
  SplitItem,
  Truncate,
} from '@patternfly/react-core';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';
import { TemplateKind } from '~/k8sTypes';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  isServingRuntimeKind,
} from '~/pages/modelServing/customServingRuntimes/utils';
import { isCompatibleWithIdentifier } from '~/pages/projects/screens/spawner/spawnerUtils';
import SimpleSelect from '~/components/SimpleSelect';
import { SupportedArea, useIsAreaAvailable } from '~/concepts/areas';

type ServingRuntimeTemplateSectionProps = {
  data: CreatingServingRuntimeObject;
  onConfigureParamsClick?: () => void;
  setData: UpdateObjectAtPropAndValue<CreatingServingRuntimeObject>;
  templates: TemplateKind[];
  isEditing?: boolean;
  compatibleIdentifiers?: string[];
  resetModelFormat?: () => void;
};

const ServingRuntimeTemplateSection: React.FC<ServingRuntimeTemplateSectionProps> = ({
  data,
  onConfigureParamsClick,
  setData,
  templates,
  isEditing,
  compatibleIdentifiers,
  resetModelFormat,
}) => {
  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;
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
          {compatibleIdentifiers?.some((identifier) =>
            isCompatibleWithIdentifier(identifier, template.objects[0]),
          ) && (
            <Label color="blue">
              Compatible with {isHardwareProfilesAvailable ? 'hardware profile' : 'accelerator'}
            </Label>
          )}
        </SplitItem>
      </Split>
    ),
  }));

  return (
    <FormGroup label="Serving runtime" fieldId="serving-runtime-template-selection" isRequired>
      <SimpleSelect
        isFullWidth
        isDisabled={isEditing}
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
          // Avoid onChange function is called twice
          // In KServe modal, it would set the model framework field to empty if there is only one option
          if (name !== data.servingRuntimeTemplateName) {
            setData('servingRuntimeTemplateName', name);
            // Reset model framework selection when changing the template in KServe modal only
            if (resetModelFormat) {
              resetModelFormat();
            }
          }
        }}
        popperProps={{ appendTo: 'inline' }}
      />
      {data.servingRuntimeTemplateName && onConfigureParamsClick && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem data-testid="serving-runtime-template-helptext">
              You can optimize model performance by{' '}
              <Button isInline onClick={() => onConfigureParamsClick()} variant="link">
                configuring the parameters
              </Button>{' '}
              of the selected serving runtime.
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </FormGroup>
  );
};

export default ServingRuntimeTemplateSection;
