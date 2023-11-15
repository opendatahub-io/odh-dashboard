import * as React from 'react';
import classNames from 'classnames';
import { Tr } from '@patternfly/react-table';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

import './ResourceTr.scss';

type Props = Omit<React.ComponentProps<typeof Tr>, 'resource'> & {
  resource: K8sResourceCommon;
};

const ResourceTr: React.ForwardRefRenderFunction<HTMLTableRowElement, Props> = (
  { resource, className, ...props },
  ref,
) => (
  <Tr
    {...props}
    className={classNames(className, {
      'odh-resource-tr--deleting': resource.metadata?.deletionTimestamp,
    })}
    ref={ref}
  />
);

export default React.forwardRef(ResourceTr);
