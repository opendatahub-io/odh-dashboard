import { renderHook, act } from '@testing-library/react';
import useAlertManagement from '~/app/Chatbot/hooks/useAlertManagement';

describe('useAlertManagement', () => {
  it('should initialize with correct default values', () => {
    const { result } = renderHook(() => useAlertManagement());

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(0);
  });

  it('should show success alert and increment alert key', () => {
    const { result } = renderHook(() => useAlertManagement());

    act(() => {
      result.current.onShowSuccessAlert();
    });

    expect(result.current.showSuccessAlert).toBe(true);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(1);
  });

  it('should show error alert and increment alert key', () => {
    const { result } = renderHook(() => useAlertManagement());

    act(() => {
      result.current.onShowErrorAlert();
    });

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(true);
    expect(result.current.alertKey).toBe(1);
  });

  it('should hide success alert without affecting error alert or alert key', () => {
    const { result } = renderHook(() => useAlertManagement());

    // First show success alert
    act(() => {
      result.current.onShowSuccessAlert();
    });

    expect(result.current.showSuccessAlert).toBe(true);
    expect(result.current.alertKey).toBe(1);

    // Then hide it
    act(() => {
      result.current.onHideSuccessAlert();
    });

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(1); // Should remain the same
  });

  it('should hide error alert without affecting success alert or alert key', () => {
    const { result } = renderHook(() => useAlertManagement());

    // First show error alert
    act(() => {
      result.current.onShowErrorAlert();
    });

    expect(result.current.showErrorAlert).toBe(true);
    expect(result.current.alertKey).toBe(1);

    // Then hide it
    act(() => {
      result.current.onHideErrorAlert();
    });

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(1); // Should remain the same
  });

  it('should handle both success and error alerts independently', () => {
    const { result } = renderHook(() => useAlertManagement());

    // Show success alert
    act(() => {
      result.current.onShowSuccessAlert();
    });

    expect(result.current.showSuccessAlert).toBe(true);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(1);

    // Show error alert
    act(() => {
      result.current.onShowErrorAlert();
    });

    expect(result.current.showSuccessAlert).toBe(true);
    expect(result.current.showErrorAlert).toBe(true);
    expect(result.current.alertKey).toBe(2);

    // Hide success alert
    act(() => {
      result.current.onHideSuccessAlert();
    });

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(true);
    expect(result.current.alertKey).toBe(2);

    // Hide error alert
    act(() => {
      result.current.onHideErrorAlert();
    });

    expect(result.current.showSuccessAlert).toBe(false);
    expect(result.current.showErrorAlert).toBe(false);
    expect(result.current.alertKey).toBe(2);
  });
});
