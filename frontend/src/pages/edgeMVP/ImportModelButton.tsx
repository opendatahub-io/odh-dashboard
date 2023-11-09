import { Button } from '@patternfly/react-core';
import * as React from 'react';
import AddModelToRegistryModal from './AddModelToRegistryModal';

const ImportModelButton: React.FC = () => {
    const [open, setOpen] = React.useState(false);
    return (
        <>
            <Button variant="primary" onClick={() => setOpen(true)}>
                Add model
            </Button>
            <AddModelToRegistryModal isOpen={open}
                onClose={(submit) => {
                    setOpen(false);
                }}
            />
        </>
    )
}

export default ImportModelButton;