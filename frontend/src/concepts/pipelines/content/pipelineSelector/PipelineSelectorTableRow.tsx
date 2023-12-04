import * as React from 'react';
import { Tooltip } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { relativeTime } from '~/utilities/time';

type PipelineSelectorTableRowProps = {
  obj: PipelineKF | PipelineVersionKF;
  onClick: () => void;
};

const PipelineSelectorTableRow: React.FC<PipelineSelectorTableRowProps> = ({ obj, onClick }) => {
  const tooltipRef = React.useRef(null);

  return (
    <>
      {obj.description && (
        <Tooltip
          position="right"
          content={
            <>
              Description:
              <br />
              {obj.description}
            </>
          }
          triggerRef={tooltipRef}
        />
      )}
      <Tr
        ref={tooltipRef}
        onRowClick={onClick}
        isClickable
        data-id="pipeline-selector-table-list-row"
      >
        <Td width={70} modifier="truncate" dataLabel="Name">
          {obj.name}
        </Td>
        <Td width={30} dataLabel="Updated">
          {relativeTime(Date.now(), new Date(obj.created_at).getTime())}
        </Td>
      </Tr>
    </>
  );
};

export default PipelineSelectorTableRow;
