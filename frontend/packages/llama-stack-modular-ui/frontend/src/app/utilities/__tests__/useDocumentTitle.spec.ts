import { renderHook } from '@testing-library/react';
import { useDocumentTitle } from '@app/utilities/useDocumentTitle';

describe('useDocumentTitle', () => {
  const originalTitle = 'Original Title';

  beforeEach(() => {
    // Set up the original document title before each test
    document.title = originalTitle;
  });

  afterEach(() => {
    // Restore the original title after each test
    document.title = originalTitle;
  });

  it('should set the document title', () => {
    const testTitle = 'Test Page Title';

    renderHook(() => useDocumentTitle(testTitle));

    expect(document.title).toBe(testTitle);
  });

  it('should restore the original title when unmounted', () => {
    const testTitle = 'Test Page Title';

    const { unmount } = renderHook(() => useDocumentTitle(testTitle));

    // Verify the title was set
    expect(document.title).toBe(testTitle);

    // Unmount the hook
    unmount();

    // Verify the original title was restored
    expect(document.title).toBe(originalTitle);
  });

  it('should update the document title when the title parameter changes', () => {
    const initialTitle = 'Initial Title';
    const updatedTitle = 'Updated Title';

    const { rerender } = renderHook(({ title }: { title: string }) => useDocumentTitle(title), {
      initialProps: { title: initialTitle },
    });

    // Verify initial title is set
    expect(document.title).toBe(initialTitle);

    // Update the title
    rerender({ title: updatedTitle });

    // Verify the title was updated
    expect(document.title).toBe(updatedTitle);
  });

  it('should restore the original title when title parameter changes', () => {
    const firstTitle = 'First Title';
    const secondTitle = 'Second Title';

    const { rerender, unmount } = renderHook(
      ({ title }: { title: string }) => useDocumentTitle(title),
      { initialProps: { title: firstTitle } },
    );

    // Change to second title
    rerender({ title: secondTitle });
    expect(document.title).toBe(secondTitle);

    // Unmount should restore the original title
    unmount();
    expect(document.title).toBe(originalTitle);
  });

  it('should handle empty string title', () => {
    const emptyTitle = '';

    renderHook(() => useDocumentTitle(emptyTitle));

    expect(document.title).toBe(emptyTitle);
  });

  it('should handle special characters in title', () => {
    const specialTitle = 'Test Title with Special Characters: !@#$%^&*()';

    renderHook(() => useDocumentTitle(specialTitle));

    expect(document.title).toBe(specialTitle);
  });
});
