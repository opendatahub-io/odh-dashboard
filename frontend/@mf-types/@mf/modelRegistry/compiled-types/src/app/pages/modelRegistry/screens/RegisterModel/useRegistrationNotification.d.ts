import React from 'react';
import type { RegistrationInlineAlert } from './RegistrationFormFooter';
import { type RegistrationToastMessagesParams } from './registrationToastMessages';
export type RegistrationNotificationActions = {
    showRegisterAndStoreStarted: (params: RegistrationToastMessagesParams) => void;
    showRegisterAndStoreError: (params: RegistrationToastMessagesParams) => void;
};
/**
 * Shared hook for registration toasts and inline alerts.
 * Shows notification (toast) always; when not using MUI theme, also updates
 * the inline alert in the form footer for consistent UX.
 */
export declare function useRegistrationNotification(setInlineAlert: React.Dispatch<React.SetStateAction<RegistrationInlineAlert | undefined>>): RegistrationNotificationActions;
