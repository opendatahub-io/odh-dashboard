import * as React from 'react';
import { ExpandableRowContent, Td } from '@patternfly/react-table';
import { ServingRuntimeKind } from '~/k8sTypes';
import EmptyTableCellForAlignment from '~/pages/projects/components/EmptyTableCellForAlignment';
import ServingRuntimeDetails from './ServingRuntimeDetails';

type ServingRuntimeTableExpandedSectionProps = {
  obj: ServingRuntimeKind;
};

const ServingRuntimeTableExpandedSection: React.FC<ServingRuntimeTableExpandedSectionProps> = ({
  obj,
}) => (
  <>
    <EmptyTableCellForAlignment />
    <Td dataLabel="Type expansion" colSpan={6}>
      <ExpandableRowContent>
        <ServingRuntimeDetails obj={obj} />
      </ExpandableRowContent>
    </Td>
  </>
);

export default ServingRuntimeTableExpandedSection;
