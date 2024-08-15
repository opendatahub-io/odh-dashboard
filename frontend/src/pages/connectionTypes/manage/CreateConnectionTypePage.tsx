import * as React from 'react';
import { createConnectionType } from '~/services/connectionTypesService';
import { ConnectionTypeConfigMapObj } from '~/concepts/connectionTypes/types';
import ManageConnectionTypePage from './ManageConnectionTypePage';

type Props = {
  prefill?: ConnectionTypeConfigMapObj;
};

const CreateConnectionTypePage: React.FC<Props> = ({ prefill }) => (
  <ManageConnectionTypePage
    prefill={prefill}
    onSave={async (obj) => {
      const response = await createConnectionType(obj);
      if (response.error) {
        throw response.error;
      }
    }}
  />
);

export default CreateConnectionTypePage;
