import { FormHelperText, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import React, { ComponentProps } from 'react';
import { ZodIssue } from 'zod';

type ZodErrorHelperTextProps = ComponentProps<typeof FormHelperText> & {
  zodIssue?: ZodIssue | ZodIssue[];
  showAllErrors?: boolean;
  description?: React.ReactNode;
};

/**
 * Displays a form helper text with a helper text item that displays the first error message.
 * If showAllErrors is true, all error messages are displayed.
 */
export const ZodErrorHelperText: React.FC<ZodErrorHelperTextProps> = ({
  zodIssue,
  showAllErrors = false,
  description,
  ...props
}) => {
  if (!zodIssue || (Array.isArray(zodIssue) && zodIssue.length === 0)) {
    if (description) {
      return (
        <FormHelperText {...props}>
          <HelperText>
            <HelperTextItem>{description}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      );
    }
    return null;
  }

  const issues = Array.isArray(zodIssue) ? zodIssue : [zodIssue];
  const displayedIssues = showAllErrors ? issues : [issues[0]];

  return (
    <FormHelperText {...props}>
      <HelperText>
        {description && <HelperTextItem>{description}</HelperTextItem>}
        {displayedIssues.map((issue, index) => (
          <HelperTextItem key={index} icon={<ExclamationCircleIcon />} variant="error">
            {issue.message}
          </HelperTextItem>
        ))}
      </HelperText>
    </FormHelperText>
  );
};
