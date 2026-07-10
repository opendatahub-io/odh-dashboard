import * as React from 'react';
import { Collection } from '~/app/types';
type CollectionDrawerPanelProps = {
    collection: Collection | undefined;
    onClose: () => void;
    onRunCollection: (c: Collection) => void;
};
declare const CollectionDrawerPanel: React.FC<CollectionDrawerPanelProps>;
export default CollectionDrawerPanel;
