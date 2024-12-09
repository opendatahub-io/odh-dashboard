import * as React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { Button, Timestamp, Tooltip } from '@patternfly/react-core';
import { BanIcon } from '@patternfly/react-icons';
import { ActionsColumn } from '@patternfly/react-table';

type Props = Omit<React.ComponentProps<typeof ActionsColumn>, 'resource'> & {
  resource: K8sResourceCommon;
};

const ResourceActionsColumn: React.FC<Props> = ({ resource, ...props }) =>
  !resource.metadata?.deletionTimestamp ? (
    <ActionsColumn {...props} />
  ) : (
    <Tooltip
      content={
        <>
          This resource is marked for deletion:{' '}
          <Timestamp date={new Date(resource.metadata.deletionTimestamp)} />
        </>
      }
    >
      <Button
        icon={<BanIcon />}
        variant="plain"
        isAriaDisabled
        aria-label="This resource is marked for deletion."
      />
    </Tooltip>
  );

export default ResourceActionsColumn;
