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
import type { ValidatedConfiguration } from '../../../../shared/types/form-data';

type ValidatedArgumentsSectionProps = {
  configurations: ValidatedConfiguration[];
  selection: ValidatedConfigurationsFieldHook;
};

export const ValidatedArgumentsSection: React.FC<ValidatedArgumentsSectionProps> = ({
  configurations,
  selection,
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
                        onSelectionChange={(checked) =>
                          selection.toggleOption(configuration.forField, option.value, checked)
                        }
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
