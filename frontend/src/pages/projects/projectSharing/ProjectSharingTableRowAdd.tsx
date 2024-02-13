import * as React from 'react';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Split, SplitItem } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { ProjectSharingRBType, ProjectSharingRoleType } from './types';
import ProjectSharingNameInput from './ProjectSharingNameInput';
import ProjectSharingPermissionSelection from './ProjectSharingPermissionSelection';

type ProjectSharingTableRowPropsAdd = {
  typeAhead?: string[];
  type: ProjectSharingRBType;
  onChange: (name: string, roleType: ProjectSharingRoleType) => void;
  onCancel: () => void;
};

/** @deprecated - this should use ProjectSharingTableRow */
const ProjectSharingTableRowAdd: React.FC<ProjectSharingTableRowPropsAdd> = ({
  typeAhead,
  type,
  onChange,
  onCancel,
}) => {
  const [roleBindingName, setRoleBindingName] = React.useState('');
  const [roleBindingRoleRef, setRoleBindingRoleRef] = React.useState<ProjectSharingRoleType>(
    ProjectSharingRoleType.EDIT,
  );
  const [isLoading, setIsLoading] = React.useState(false);

  return (
    <Tbody>
      <Tr>
        <Td dataLabel="Username">
          <ProjectSharingNameInput
            type={type}
            value={roleBindingName}
            onChange={(selection: React.SetStateAction<string>) => {
              setRoleBindingName(selection);
            }}
            onClear={() => setRoleBindingName('')}
            placeholderText={roleBindingName}
            typeAhead={typeAhead}
          />
        </Td>
        <Td dataLabel="Permission">
          <ProjectSharingPermissionSelection
            selection={roleBindingRoleRef}
            onSelect={(selection) => {
              setRoleBindingRoleRef(selection);
            }}
          />
        </Td>
        <Td dataLabel="Date added" />
        <Td isActionCell modifier="nowrap">
          <Split>
            <SplitItem>
              <Button
                data-id="save-rolebinding-button"
                aria-label="Save role binding"
                variant="link"
                icon={<CheckIcon />}
                isDisabled={isLoading || !roleBindingName || !roleBindingRoleRef}
                onClick={() => {
                  setIsLoading(true);
                  onChange(roleBindingName, roleBindingRoleRef);
                }}
              />
            </SplitItem>
            <SplitItem>
              <Button
                data-id="cancel-rolebinding-button"
                aria-label="Cancel role binding"
                variant="plain"
                isDisabled={isLoading}
                icon={<TimesIcon />}
                onClick={() => {
                  onCancel();
                }}
              />
            </SplitItem>
          </Split>
        </Td>
      </Tr>
    </Tbody>
  );
};

export default ProjectSharingTableRowAdd;
