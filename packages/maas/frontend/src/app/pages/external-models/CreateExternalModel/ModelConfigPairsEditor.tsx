import * as React from 'react';
import ConfigPairsEditor from '~/app/components/ConfigPairsEditor';
import { ConfigPair, configPairsToRecord } from '~/app/utilities/configPairs';

export type { ConfigPair };
export { configPairsToRecord };

type ModelConfigPairsEditorProps = {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
};

const ModelConfigPairsEditor: React.FC<ModelConfigPairsEditorProps> = ({ pairs, onChange }) => (
  <ConfigPairsEditor
    pairs={pairs}
    onChange={onChange}
    testIdPrefix="provider-ref-config"
    addButtonTestId="add-configuration-pair-button"
  />
);

export default ModelConfigPairsEditor;
