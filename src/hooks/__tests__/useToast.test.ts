import { renderHook, act } from '@testing-library/react';
import { useToast } from '../useToast';

describe('useToast', () => {
  test('should initialize with empty toast list', () => {
    const { result } = renderHook(() => useToast());
    
    expect(result.current.toasts).toEqual([]);
  });

  test('should add toast when addToast is called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast('Test message', 'success');
    });
    
    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0]).toMatchObject({
      message: 'Test message',
      type: 'success',
    });
    expect(result.current.toasts[0].id).toBeDefined();
  });

  test('should remove toast when removeToast is called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast('Test message', 'info');
    });
    
    const toastId = result.current.toasts[0].id;
    
    act(() => {
      result.current.removeToast(toastId);
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });

  test('should handle multiple toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast('Message 1', 'success');
      result.current.addToast('Message 2', 'error');
      result.current.addToast('Message 3', 'warning');
    });
    
    expect(result.current.toasts).toHaveLength(3);
    expect(result.current.toasts[0].message).toBe('Message 1');
    expect(result.current.toasts[1].message).toBe('Message 2');
    expect(result.current.toasts[2].message).toBe('Message 3');
  });

  test('should generate unique IDs for toasts', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast('Message 1', 'success');
      result.current.addToast('Message 2', 'error');
    });
    
    const ids = result.current.toasts.map(toast => toast.id);
    expect(ids[0]).not.toEqual(ids[1]);
  });

  test('should handle all toast types', () => {
    const { result } = renderHook(() => useToast());
    
    const types = ['success', 'error', 'warning', 'info'] as const;
    
    act(() => {
      types.forEach(type => {
        result.current.addToast(`${type} message`, type);
      });
    });
    
    expect(result.current.toasts).toHaveLength(4);
    types.forEach((type, index) => {
      expect(result.current.toasts[index].type).toBe(type);
    });
  });

  test('should clear all toasts when clearToasts is called', () => {
    const { result } = renderHook(() => useToast());
    
    act(() => {
      result.current.addToast('Message 1', 'success');
      result.current.addToast('Message 2', 'error');
    });
    
    expect(result.current.toasts).toHaveLength(2);
    
    act(() => {
      result.current.clearToasts();
    });
    
    expect(result.current.toasts).toHaveLength(0);
  });
});