import React from 'react';
type ModelDetailsPageProps = {
    tab: string;
    customNoRegistriesButton?: (variant: 'primary' | 'secondary') => React.ReactNode;
};
declare const ModelDetailsPage: React.FC<ModelDetailsPageProps>;
export default ModelDetailsPage;
