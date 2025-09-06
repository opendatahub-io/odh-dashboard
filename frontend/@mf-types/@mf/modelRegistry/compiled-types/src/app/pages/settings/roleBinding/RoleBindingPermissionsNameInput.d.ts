import * as React from 'react';
import { RoleBindingSubject } from 'mod-arch-shared';
type RoleBindingPermissionsNameInputProps = {
    subjectKind: RoleBindingSubject['kind'];
    value: string;
    onChange?: (selection: string) => void;
    onClear?: () => void;
    placeholderText?: string;
    typeAhead?: string[];
    isProjectSubject?: boolean;
};
export declare const RoleBindingPermissionsNameInput: React.FC<RoleBindingPermissionsNameInputProps>;
export {};
