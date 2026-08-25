import React from 'react';
import {
  FormGroup,
  Gallery,
  GalleryItem,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ValidatedConfigurationOptionCard } from './ValidatedConfigurationOptionCard';
import type { ValidatedConfigurationsFieldHook } from './useValidatedConfigurationsField';
import {
  mergeValidatedOptionIntoArgs,
  removeValidatedOptionFromArgs,
  slugifyValidatedOptionTitle,
  toRuntimeArgsFieldData,
} from './validatedConfigurationUtils';
import { fireValidatedArgumentSelected } from '../../../../shared/tracking/deployWizardTracking';
import type { ValidatedConfiguration } from '../../../../shared/types/form-data';
import type { RuntimeArgsFieldHook } from '../RuntimeArgsField';

type ValidatedArgumentsSectionProps = {
  configurations: ValidatedConfiguration[];
  selection: ValidatedConfigurationsFieldHook;
  runtimeArgs: RuntimeArgsFieldHook;
  catalogModelId?: string;
};

export const ValidatedArgumentsSection: React.FC<ValidatedArgumentsSectionProps> = ({
  configurations,
  selection,
  runtimeArgs,
  catalogModelId,
}) => {
  return (
    <>
      {configurations.map((configuration) => (
        <div
          key={configuration.forField}
          data-testid={`validated-configuration-section-${configuration.forField}`}
        >
          <FormGroup
            label={configuration.title}
            fieldId={`validated-configuration-${configuration.forField}`}
          >
            <Stack hasGutter>
              <StackItem>
                <HelperText>
                  <HelperTextItem>{configuration.description}</HelperTextItem>
                </HelperText>
              </StackItem>
              <StackItem>
                <Gallery
                  hasGutter
                  minWidths={{ default: '100%', md: '330px' }}
                  maxWidths={{ default: '100%', md: '330px' }}
                  data-testid={`validated-configuration-options-${configuration.forField}`}
                >
                  {configuration.options.map((option) => (
                    <GalleryItem key={option.value}>
                      <ValidatedConfigurationOptionCard
                        option={option}
                        isSelected={selection.isOptionSelected(
                          configuration.forField,
                          option.value,
                        )}
                        catalogModelId={catalogModelId}
                        onSelectionChange={(checked) => {
                          fireValidatedArgumentSelected({
                            configurationName: option.title,
                            configurationIcon: slugifyValidatedOptionTitle(option.title),
                            isSelected: checked,
                            catalogModelId,
                            entryPoint: 'model_details',
                            hasValidatedArgumentsSection: true,
                          });
                          selection.toggleOption(configuration.forField, option.value, checked);
                          if (configuration.forField === 'args') {
                            runtimeArgs.setData((prev) => {
                              const currentArgs = prev?.args ?? [];
                              const nextArgs = checked
                                ? mergeValidatedOptionIntoArgs(currentArgs, option)
                                : removeValidatedOptionFromArgs(currentArgs, option);
                              return toRuntimeArgsFieldData(nextArgs);
                            });
                          }
                        }}
                      />
                    </GalleryItem>
                  ))}
                </Gallery>
              </StackItem>
            </Stack>
          </FormGroup>
        </div>
      ))}
    </>
  );
};
