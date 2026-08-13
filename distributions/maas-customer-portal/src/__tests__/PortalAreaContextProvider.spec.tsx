import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  AreaContext,
  SupportedArea,
  useIsAreaAvailable,
  type AreaContextState,
  type IsAreaAvailableStatus,
  type SupportedAreaType,
} from '@odh-dashboard/plugin-core/areas';
import PortalAreaContextProvider from '../PortalAreaContextProvider';

const AREA_SAMPLES = [
  SupportedArea.MODEL_SERVING,
  SupportedArea.DS_PROJECTS_VIEW,
  SupportedArea.DS_PIPELINES,
] as const;

const AreaContextReader: React.FC = () => {
  const ctx = React.useContext(AreaContext);
  return <pre data-testid="area-context">{JSON.stringify(ctx)}</pre>;
};

const AreaHookReader: React.FC<{ area: SupportedAreaType }> = ({ area }) => {
  const result = useIsAreaAvailable(area);
  return <pre data-testid={`hook-${area}`}>{JSON.stringify(result)}</pre>;
};

const AreaHookCapture: React.FC<{
  area: SupportedAreaType;
  setResult: (result: IsAreaAvailableStatus) => void;
}> = ({ area, setResult }) => {
  const result = useIsAreaAvailable(area);
  React.useLayoutEffect(() => {
    setResult(result);
  }, [result, setResult]);
  return null;
};

const getContext = (): AreaContextState => {
  const el = screen.getByTestId('area-context');
  return JSON.parse(String(el.textContent));
};

describe('PortalAreaContextProvider', () => {
  describe('static context value', () => {
    it('should set dscStatus and dsciStatus to null', () => {
      render(
        <PortalAreaContextProvider>
          <AreaContextReader />
        </PortalAreaContextProvider>,
      );
      const ctx = getContext();
      expect(ctx.dscStatus).toBeNull();
      expect(ctx.dsciStatus).toBeNull();
    });

    it('should provide an empty areasStatus map', () => {
      render(
        <PortalAreaContextProvider>
          <AreaContextReader />
        </PortalAreaContextProvider>,
      );
      expect(getContext().areasStatus).toEqual({});
    });
  });

  describe('useIsAreaAvailable', () => {
    it.each(AREA_SAMPLES)('should return status false for %s via hook fallback', (area) => {
      render(
        <PortalAreaContextProvider>
          <AreaHookReader area={area} />
        </PortalAreaContextProvider>,
      );
      const result = JSON.parse(String(screen.getByTestId(`hook-${area}`).textContent));
      expect(result.status).toBe(false);
    });

    it.each(AREA_SAMPLES)(
      'should keep %s unavailable even when the passed condition function reports true',
      (area) => {
        const bag: { result: IsAreaAvailableStatus | null } = { result: null };
        render(
          <PortalAreaContextProvider>
            <AreaHookCapture
              area={area}
              setResult={(result) => {
                bag.result = result;
              }}
            />
          </PortalAreaContextProvider>,
        );
        expect(bag.result?.customCondition).toEqual(expect.any(Function));
        expect(bag.result?.customCondition(() => true)).toBe(false);
      },
    );
  });
});
