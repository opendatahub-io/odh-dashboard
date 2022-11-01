import * as React from 'react';
import * as _ from 'lodash';
import useRelatedNotebooks from './useRelatedNotebooks';
import { ProjectDetailsContext } from '../ProjectDetailsContext';

const useNonConnectedNotebooks = (
  ...args: Parameters<typeof useRelatedNotebooks>
): ReturnType<typeof useRelatedNotebooks> => {
  const {
    notebooks: { data },
  } = React.useContext(ProjectDetailsContext);
  const allNotebooks = data.map(({ notebook }) => notebook);
  const { notebooks, ...rest } = useRelatedNotebooks(...args);
  const availableNotebooks = _.difference(allNotebooks, notebooks);

  return { notebooks: availableNotebooks, ...rest };
};

export default useNonConnectedNotebooks;
