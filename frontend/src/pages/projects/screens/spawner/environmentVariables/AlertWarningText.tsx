import { Alert, List, ListItem, Stack, StackItem } from '@patternfly/react-core';
import React from 'react';

type AlertWarningTextProps = {
  deletedConfigMaps: string[];
  deletedSecrets: string[];
};

const AlertWarningText: React.FC<AlertWarningTextProps> = ({
  deletedConfigMaps,
  deletedSecrets,
}) => {
  if (deletedConfigMaps.length === 0 && deletedSecrets.length === 0) {
    return null;
  }

  const formattedText = (items: string[], type: 'config map' | 'secret') => {
    if (items.length === 1) {
      return (
        <>
          <strong>{items[0]}</strong> {type}
        </>
      );
    }
    const lastItem = items[items.length - 1];
    const displayItems = items.slice(0, -1);
    return (
      <>
        {displayItems.map((item, index) => (
          <>
            <strong key={index}>{item}</strong>
            {index < displayItems.length - 1 ? ', ' : ' and '}
          </>
        ))}
        <strong>{lastItem}</strong> {type}s
      </>
    );
  };

  let description;
  const commonDescriptionText = `To remove the orphaned connection, save the workbench.`;
  const formattedConfigMapsText = formattedText(deletedConfigMaps, 'config map');
  const formattedSecretsText = formattedText(deletedSecrets, 'secret');

  if (deletedConfigMaps.length > 0 && deletedSecrets.length > 0) {
    description = (
      <Stack hasGutter>
        <StackItem>
          The following environment variables in this workbench cannot be found:
        </StackItem>
        <StackItem>
          <List>
            {[formattedConfigMapsText, formattedSecretsText].map((text, i) => (
              <ListItem key={i}>{text}</ListItem>
            ))}
          </List>
        </StackItem>
        <StackItem>{commonDescriptionText}</StackItem>
      </Stack>
    );
  } else if (deletedConfigMaps.length > 0) {
    description = (
      <>
        The {formattedConfigMapsText}
        {deletedConfigMaps.length === 1 ? ' cannot be found. ' : ' are not found. '}
        {commonDescriptionText}
      </>
    );
  } else {
    description = (
      <>
        The {formattedSecretsText}
        {deletedSecrets.length === 1 ? ' cannot be found. ' : ' are not found. '}
        {commonDescriptionText}
      </>
    );
  }

  return (
    <Alert
      data-testid="env-variable-alert-message"
      title="Environment variable not found"
      isInline
      variant="warning"
    >
      {description}
    </Alert>
  );
};

export default AlertWarningText;
