import * as React from 'react';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { Button, Split, SplitItem } from '@patternfly/react-core';
import { CheckIcon, TimesIcon } from '@patternfly/react-icons';
import { ProjectSharingRoleType } from './types';
import ProjectSharingNameInput from './ProjectSharingNameInput';
import ProjectSharingPermissionSelection from './ProjectSharingPermissionSelection';

type ProjectSharingTableRowPropsAdd = {
  typeAhead?: string[];
  onChange: (name: string, roleType: ProjectSharingRoleType) => void;
  onCancel: () => void;
};

const ProjectSharingTableRowAdd: React.FC<ProjectSharingTableRowPropsAdd> = ({
  typeAhead,
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
            value={roleBindingName}
            onChange={(selection) => {
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
        <Td dataLabel="Date added"></Td>
        <Td isActionCell modifier="nowrap">
          <Split>
            <SplitItem>
              <Button
                data-id="save-rolebinding-button"
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
