import React from 'react';
type ModelRegistryDatabasePasswordProps = {
    password: string | undefined;
    setPassword: (value: string) => void;
    showPassword?: boolean;
    isPasswordTouched?: boolean;
    setIsPasswordTouched: (value: boolean) => void;
};
declare const ModelRegistryDatabasePassword: React.FC<ModelRegistryDatabasePasswordProps>;
export default ModelRegistryDatabasePassword;
