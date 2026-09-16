import React from 'react';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  Popover,
} from '@patternfly/react-core';
import { useTrackEvent } from '@odh-dashboard/plugin-core/host-api';
import {
  formatValidatedOptionValueForDisplay,
  slugifyValidatedOptionTitle,
} from './validatedConfigurationUtils';
import { fireValidatedArgumentsViewed } from '../../../../shared/tracking/deployWizardTracking';
import type { ValidatedConfigurationOption } from '../../../../shared/types/form-data';

type ValidatedConfigurationOptionCardProps = {
  option: ValidatedConfigurationOption;
  isSelected: boolean;
  onSelectionChange: (checked: boolean) => void;
  catalogModelId?: string;
};

export const ValidatedConfigurationOptionCard: React.FC<ValidatedConfigurationOptionCardProps> = ({
  option,
  isSelected,
  onSelectionChange,
  catalogModelId,
}) => {
  const trackEvent = useTrackEvent();
  const optionSlug = slugifyValidatedOptionTitle(option.title);
  const formattedArgs = formatValidatedOptionValueForDisplay(option.value);

  return (
    <Card
      isClickable
      isSelectable
      isSelected={isSelected}
      isFullHeight
      id={`select-config-${optionSlug}`}
      data-testid={`validated-configuration-option-${optionSlug}`}
    >
      <CardHeader
        selectableActions={{
          selectableActionId: `validated-configuration-option-checkbox-${optionSlug}`,
          selectableActionAriaLabel: `Select ${option.title}`,
          name: `validated-configuration-option-${optionSlug}`,
          variant: 'multiple',
          onChange: (_event, checked) => onSelectionChange(checked),
          isChecked: isSelected,
          selectableActionProps: {
            'data-testid': `validated-configuration-option-checkbox-${optionSlug}`,
          },
        }}
      >
        <CardTitle>{option.title}</CardTitle>
      </CardHeader>
      <CardBody>
        <Content component="p">{option.description}</Content>
      </CardBody>
      <CardFooter>
        <Popover
          aria-label={`${option.title} arguments`}
          headerContent={`${option.title} arguments`}
          onShow={() => {
            fireValidatedArgumentsViewed(trackEvent, {
              configurationName: option.title,
              catalogModelId,
              entryPoint: 'model_details',
              hasValidatedArgumentsSection: true,
            });
          }}
          bodyContent={
            <pre
              data-testid={`validated-configuration-arguments-popover-content-${optionSlug}`}
              className="pf-v6-u-font-family-monospace pf-v6-u-white-space-pre-wrap pf-v6-u-pt-sm"
            >
              {formattedArgs}
            </pre>
          }
        >
          <Button
            variant="link"
            isInline
            id={`select-config-view-${optionSlug}`}
            data-testid={`validated-configuration-view-arguments-${optionSlug}`}
          >
            View arguments
          </Button>
        </Popover>
      </CardFooter>
    </Card>
  );
};
