import * as React from 'react';
import {
    EmptyState,
    EmptyStateBody,
    EmptyStateIcon,
    Title
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import ImportModelButton from './ImportModelButton';

const EmptyModelRegistry: React.FC = () => {

    return (
        <EmptyState>
            <EmptyStateIcon icon={PlusCircleIcon} />
            <Title headingLevel="h2" size="lg" style={{ marginBottom: '10px' }}>
                No models in the registry
            </Title>
            <EmptyStateBody style={{ margin: 'auto', width: '50%' }}>To get started, add a model to the model registry. Adding a model will also initiate a pipeline that will build the model and its dependencies into a container image and save that image in a container image registry.</EmptyStateBody>
            <ImportModelButton />
        </EmptyState>
    )
}

export default EmptyModelRegistry;