import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { getNotebookMountPaths } from '../../../notebook/utils';
import { ForNotebookSelection } from '../../../types';
import MountPathField from '../../../pvc/MountPathField';
import { ProjectDetailsContext } from '../../../ProjectDetailsContext';
import SelectNotebookField from '../../../notebook/SelectNotebookField';

type ConnectExistingNotebookProps = {
  forNotebookData: ForNotebookSelection;
  setForNotebookData: (value: ForNotebookSelection) => void;
  isDisabled: boolean;
};

const ConnectExistingNotebook: React.FC<ConnectExistingNotebookProps> = ({
  forNotebookData,
  setForNotebookData,
  isDisabled,
}) => {
  const {
    notebooks: { data, loaded, error },
  } = React.useContext(ProjectDetailsContext);
  const notebooks = data.map(({ notebook }) => notebook);

  if (error) {
    return (
      <Alert variant="danger" isInline title="Unable to fetch notebooks">
        {error.message}
      </Alert>
    );
  }

  const inUseMountPaths = getNotebookMountPaths(
    notebooks.find((notebook) => notebook.metadata.name === forNotebookData.name),
  );

  return (
    <>
      <SelectNotebookField
        isDisabled={isDisabled}
        loaded={loaded}
        notebooks={notebooks}
        selection={forNotebookData.name}
        onSelect={(selection) => {
          if (selection) {
            setForNotebookData({
              name: selection,
              mountPath: { value: '', error: '' },
            });
          } else {
            setForNotebookData({ name: '', mountPath: { value: '', error: '' } });
          }
        }}
        selectionHelperText="Optionally connect it to an existing workbench"
      />
      {forNotebookData.name && (
        <MountPathField
          inUseMountPaths={inUseMountPaths}
          mountPath={forNotebookData.mountPath}
          setMountPath={(mountPath) => {
            setForNotebookData({ ...forNotebookData, mountPath });
          }}
        />
      )}
    </>
  );
};

export default ConnectExistingNotebook;
