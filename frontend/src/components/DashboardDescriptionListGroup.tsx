import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Button,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Split,
  SplitItem,
  Text,
} from '@patternfly/react-core';
import text from '@patternfly/react-styles/css/utilities/Text/text';
import { CheckIcon, PencilAltIcon, TimesIcon } from '@patternfly/react-icons';

import './DashboardDescriptionListGroup.scss';

type EditableProps = {
  isEditing: boolean;
  contentWhenEditing: React.ReactNode;
  isSavingEdits?: boolean;
  onEditClick: () => void;
  onSaveEditsClick: () => void;
  onDiscardEditsClick: () => void;
};

export type DashboardDescriptionListGroupProps = {
  title: React.ReactNode;
  action?: React.ReactNode;
  isEmpty?: boolean;
  contentWhenEmpty?: React.ReactNode;
  children: React.ReactNode;
} & (({ isEditable: true } & EditableProps) | ({ isEditable?: false } & Partial<EditableProps>));

const DashboardDescriptionListGroup: React.FC<DashboardDescriptionListGroupProps> = (props) => {
  const {
    title,
    action,
    isEmpty,
    contentWhenEmpty,
    isEditable = false,
    isEditing,
    contentWhenEditing,
    isSavingEdits = false,
    onEditClick,
    onSaveEditsClick,
    onDiscardEditsClick,
    children,
  } = props;
  return (
    <DescriptionListGroup>
      {action || isEditable ? (
        <DescriptionListTerm className="odh-custom-description-list-term-with-action">
          <Split>
            <SplitItem isFilled>{title}</SplitItem>
            <SplitItem>
              {action ||
                (isEditing ? (
                  <ActionList isIconList>
                    <ActionListItem>
                      <Button
                        data-testid={`save-edit-button-${title}`}
                        aria-label={`Save edits to ${title}`}
                        variant="link"
                        onClick={onSaveEditsClick}
                        isDisabled={isSavingEdits}
                      >
                        <CheckIcon />
                      </Button>
                    </ActionListItem>
                    <ActionListItem>
                      <Button
                        data-testid={`discard-edit-button-${title} `}
                        aria-label={`Discard edits to ${title} `}
                        variant="plain"
                        onClick={onDiscardEditsClick}
                        isDisabled={isSavingEdits}
                      >
                        <TimesIcon />
                      </Button>
                    </ActionListItem>
                  </ActionList>
                ) : (
                  <Button
                    data-testid={`edit-button-${title}`}
                    aria-label={`Edit ${title}`}
                    isInline
                    variant="link"
                    icon={<PencilAltIcon />}
                    iconPosition="end"
                    onClick={onEditClick}
                  >
                    Edit
                  </Button>
                ))}
            </SplitItem>
          </Split>
        </DescriptionListTerm>
      ) : (
        <DescriptionListTerm>{title}</DescriptionListTerm>
      )}
      <DescriptionListDescription className={isEmpty && !isEditing ? text.disabledColor_100 : ''}>
        {isEditing ? (
          contentWhenEditing
        ) : isEmpty ? (
          <Text style={{ color: '--pf-v5-global--Color--200' }}>{contentWhenEmpty}</Text>
        ) : (
          children
        )}
      </DescriptionListDescription>
    </DescriptionListGroup>
  );
};

export default DashboardDescriptionListGroup;
