import React from 'react';
import { OdhApplication } from '#~/types';
import EnableModal from '#~/pages/exploreApplication/EnableModal';

type ModalComponent = React.ComponentType<React.ComponentProps<typeof EnableModal>>;

const useOdhAppEnableModal = (odhApp: OdhApplication): ModalComponent | null => {
  const [LoadedComponent, setLoadedComponent] = React.useState<ModalComponent | null>(null);

  React.useEffect(() => {
    if (odhApp.spec.enableCustom) {
      import(`./custom/${odhApp.spec.enableCustom}.tsx`)
        .then((module: { default: ModalComponent }) => {
          setLoadedComponent(() => module.default);
        })
        .catch(() => {
          setLoadedComponent(() => EnableModal);
        });
    } else {
      setLoadedComponent(() => EnableModal);
    }
  }, [odhApp.spec.enableCustom]);

  return LoadedComponent;
};

export default useOdhAppEnableModal;
