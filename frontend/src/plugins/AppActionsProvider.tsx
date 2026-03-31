import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertVariant } from '@patternfly/react-core';
import {
  AppActionsContext,
  type AppActions,
  type AppNotificationAction,
  type AppNotificationActions,
} from '@odh-dashboard/plugin-core';
import { addNotification } from '#~/redux/actions/actions';
import { useAppDispatch } from '#~/redux/hooks';

type ModalEntry = {
  id: string;
  // `any` is required because the generic prop type from openModal<P> is erased when
  // stored in state — we can't parameterize ModalEntry over P. Type safety is enforced
  // at the call site via the generic signature on AppActions['openModal'].
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Component: React.ComponentType<any>;
  props: Record<string, unknown>;
};

let modalIdCounter = 0;

const AppActionsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [modals, setModals] = React.useState<ModalEntry[]>([]);

  const removeModal = React.useCallback((id: string) => {
    setModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const notification: AppNotificationActions = React.useMemo(
    () => ({
      success: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => {
        dispatch(
          addNotification({
            status: AlertVariant.success,
            title,
            message,
            actions,
            timestamp: new Date(),
          }),
        );
      },
      error: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => {
        dispatch(
          addNotification({
            status: AlertVariant.danger,
            title,
            message,
            actions,
            timestamp: new Date(),
          }),
        );
      },
      info: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => {
        dispatch(
          addNotification({
            status: AlertVariant.info,
            title,
            message,
            actions,
            timestamp: new Date(),
          }),
        );
      },
      warning: (title: string, message?: React.ReactNode, actions?: AppNotificationAction[]) => {
        dispatch(
          addNotification({
            status: AlertVariant.warning,
            title,
            message,
            actions,
            timestamp: new Date(),
          }),
        );
      },
    }),
    [dispatch],
  );

  const openModal: AppActions['openModal'] = React.useCallback(
    (Component, props) => {
      const id = String(++modalIdCounter);
      const entry: ModalEntry = { id, Component, props: props ?? {} };
      setModals((prev) => [...prev, entry]);
      return {
        close: () => removeModal(id),
      };
    },
    [removeModal],
  );

  const appActions: AppActions = React.useMemo(
    () => ({
      navigate,
      notification,
      openModal,
    }),
    [navigate, notification, openModal],
  );

  return (
    <AppActionsContext.Provider value={appActions}>
      {children}
      {modals.map((modal) => (
        <ModalRenderer key={modal.id} modal={modal} onRemove={() => removeModal(modal.id)} />
      ))}
    </AppActionsContext.Provider>
  );
};

type ModalRendererProps = {
  modal: ModalEntry;
  onRemove: () => void;
};

const ModalRenderer: React.FC<ModalRendererProps> = ({ modal, onRemove }) => {
  const { onClose: callerOnClose, ...rest } = modal.props;
  const onClose = (...args: unknown[]) => {
    onRemove();
    if (typeof callerOnClose === 'function') {
      callerOnClose(...args);
    }
  };
  return <modal.Component {...rest} onClose={onClose} />;
};

export default AppActionsProvider;
