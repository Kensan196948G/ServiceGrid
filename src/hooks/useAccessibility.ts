/**
 * アクセシビリティ支援カスタムフック
 * React 19対応のアクセシビリティ機能を提供
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { 
  announceToScreenReader, 
  manageFocus, 
  ariaHelpers,
  keyboardHandlers 
} from '../utils/accessibility';

// スクリーンリーダー向けアナウンス
export const useAnnouncement = () => {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    announceToScreenReader(message, priority);
  }, []);

  return { announce };
};

// フォーカス管理
export const useFocusManagement = () => {
  const elementRef = useRef<HTMLElement>(null);

  const saveFocus = useCallback(() => {
    manageFocus.saveFocus();
  }, []);

  const restoreFocus = useCallback(() => {
    manageFocus.restoreFocus();
  }, []);

  const focusElement = useCallback(() => {
    if (elementRef.current) {
      elementRef.current.focus();
    }
  }, []);

  return {
    elementRef,
    saveFocus,
    restoreFocus,
    focusElement
  };
};

// フォーカストラップ（モーダル等で使用）
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const cleanup = containerRef.current ? 
      require('../utils/accessibility').trapFocus(containerRef.current) : 
      undefined;

    return cleanup;
  }, [isActive]);

  return containerRef;
};

// キーボードナビゲーション
export const useKeyboardNavigation = (
  options: {
    onEscape?: () => void;
    onEnter?: () => void;
    onSpace?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
  } = {}
) => {
  const {
    onEscape,
    onEnter,
    onSpace,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight
  } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (onEscape && e.key === 'Escape') {
      e.preventDefault();
      onEscape();
    } else if (onEnter && e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    } else if (onSpace && e.key === ' ') {
      e.preventDefault();
      onSpace();
    } else if (onArrowUp && e.key === 'ArrowUp') {
      e.preventDefault();
      onArrowUp();
    } else if (onArrowDown && e.key === 'ArrowDown') {
      e.preventDefault();
      onArrowDown();
    } else if (onArrowLeft && e.key === 'ArrowLeft') {
      e.preventDefault();
      onArrowLeft();
    } else if (onArrowRight && e.key === 'ArrowRight') {
      e.preventDefault();
      onArrowRight();
    }
  }, [onEscape, onEnter, onSpace, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);

  return { handleKeyDown };
};

// ARIA属性管理
export const useAriaAttributes = (baseId?: string) => {
  const [id] = useState(() => baseId || ariaHelpers.generateId());
  const [describedByIds, setDescribedByIds] = useState<string[]>([]);

  const addDescribedBy = useCallback((newId: string) => {
    setDescribedByIds(prev => [...prev, newId]);
  }, []);

  const removeDescribedBy = useCallback((idToRemove: string) => {
    setDescribedByIds(prev => prev.filter(id => id !== idToRemove));
  }, []);

  const ariaProps = {
    id,
    ...(describedByIds.length > 0 ? { 'aria-describedby': describedByIds.join(' ') } : {})
  };

  return {
    id,
    ariaProps,
    addDescribedBy,
    removeDescribedBy
  };
};

// ライブリージョン管理
export const useLiveRegion = (initialText = '') => {
  const [text, setText] = useState(initialText);
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const updateLiveRegion = useCallback((newText: string, priority: 'polite' | 'assertive' = 'polite') => {
    setText(newText);
    setPoliteness(priority);
    announceToScreenReader(newText, priority);
  }, []);

  const clearLiveRegion = useCallback(() => {
    setText('');
  }, []);

  return {
    text,
    politeness,
    updateLiveRegion,
    clearLiveRegion
  };
};

// スキップリンク
export const useSkipLink = () => {
  const skipToContent = useCallback((contentId: string) => {
    const contentElement = document.getElementById(contentId);
    if (contentElement) {
      contentElement.tabIndex = -1;
      contentElement.focus();
      announceToScreenReader('メインコンテンツにスキップしました');
    }
  }, []);

  return { skipToContent };
};

// 縮小モーション設定
export const useReducedMotion = () => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
};

// 高コントラスト設定
export const useHighContrast = () => {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setPrefersHighContrast(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast;
};

// フォーカス表示管理
export const useFocusVisible = () => {
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    let hadKeyboardEvent = false;

    const onKeyDown = () => {
      hadKeyboardEvent = true;
    };

    const onMouseDown = () => {
      hadKeyboardEvent = false;
    };

    const onFocus = () => {
      if (hadKeyboardEvent) {
        setIsFocusVisible(true);
      }
    };

    const onBlur = () => {
      setIsFocusVisible(false);
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
    };
  }, []);

  return {
    elementRef,
    isFocusVisible
  };
};

// ロールアウト済みアクセシビリティ機能の統合フック
export const useAccessibility = (options: {
  announceChanges?: boolean;
  manageFocus?: boolean;
  keyboardNavigation?: boolean;
  ariaSupport?: boolean;
} = {}) => {
  const {
    announceChanges = true,
    manageFocus = true,
    keyboardNavigation = true,
    ariaSupport = true
  } = options;

  // 各機能のフック
  const { announce } = useAnnouncement();
  const focusManagement = useFocusManagement();
  const { handleKeyDown } = useKeyboardNavigation();
  const ariaAttributes = useAriaAttributes();
  const prefersReducedMotion = useReducedMotion();
  const prefersHighContrast = useHighContrast();

  // 統合された機能を返す
  return {
    ...(announceChanges && { announce }),
    ...(manageFocus && { focusManagement }),
    ...(keyboardNavigation && { handleKeyDown }),
    ...(ariaSupport && { ariaAttributes }),
    preferences: {
      prefersReducedMotion,
      prefersHighContrast
    }
  };
};

export default useAccessibility;