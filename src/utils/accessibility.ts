/**
 * アクセシビリティ支援ユーティリティ
 * WCAG 2.1 AA準拠のアクセシビリティ機能を提供
 */

// スクリーンリーダー向けライブリージョン管理
let announcer: HTMLElement | null = null;

export const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
  if (!announcer) {
    announcer = document.createElement('div');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.style.position = 'absolute';
    announcer.style.left = '-10000px';
    announcer.style.width = '1px';
    announcer.style.height = '1px';
    announcer.style.overflow = 'hidden';
    document.body.appendChild(announcer);
  }
  
  announcer.setAttribute('aria-live', priority);
  announcer.textContent = message;
  
  // Clear message after announcement
  setTimeout(() => {
    if (announcer) announcer.textContent = '';
  }, 1000);
};

// キーボードナビゲーション支援
export const trapFocus = (element: HTMLElement) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as NodeListOf<HTMLElement>;
  
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  
  const handleTabKey = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement?.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement?.focus();
        e.preventDefault();
      }
    }
  };
  
  element.addEventListener('keydown', handleTabKey);
  firstElement?.focus();
  
  return () => {
    element.removeEventListener('keydown', handleTabKey);
  };
};

// コントラスト比チェック
export const checkColorContrast = (foreground: string, background: string): number => {
  const getLuminance = (color: string): number => {
    const rgb = color.match(/\d+/g);
    if (!rgb) return 0;
    
    const [r, g, b] = rgb.map(c => {
      const sRGB = parseInt(c, 10) / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
};

// WCAG準拠チェック
export const isWCAGCompliant = (contrast: number, level: 'AA' | 'AAA' = 'AA', isLargeText = false): boolean => {
  if (level === 'AAA') {
    return isLargeText ? contrast >= 4.5 : contrast >= 7;
  }
  return isLargeText ? contrast >= 3 : contrast >= 4.5;
};

// フォーカス管理
export const manageFocus = {
  // 前回フォーカスされていた要素を記憶
  previousElement: null as HTMLElement | null,
  
  // フォーカスを保存
  saveFocus(): void {
    this.previousElement = document.activeElement as HTMLElement;
  },
  
  // フォーカスを復元
  restoreFocus(): void {
    if (this.previousElement && typeof this.previousElement.focus === 'function') {
      this.previousElement.focus();
    }
  },
  
  // 次のフォーカス可能要素に移動
  moveToNext(): void {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const nextIndex = (currentIndex + 1) % focusableElements.length;
    focusableElements[nextIndex]?.focus();
  },
  
  // 前のフォーカス可能要素に移動
  moveToPrevious(): void {
    const focusableElements = Array.from(
      document.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ) as HTMLElement[];
    
    const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement);
    const prevIndex = currentIndex === 0 ? focusableElements.length - 1 : currentIndex - 1;
    focusableElements[prevIndex]?.focus();
  }
};

// ARIA属性ヘルパー
export const ariaHelpers = {
  // 一意のIDを生成
  generateId: (prefix = 'element'): string => {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // 説明的なラベルを作成
  createDescriptiveLabel: (baseLabel: string, context?: string): string => {
    return context ? `${baseLabel} - ${context}` : baseLabel;
  },
  
  // エラーメッセージのARIA属性を生成
  getErrorAria: (hasError: boolean, errorId?: string) => ({
    'aria-invalid': hasError,
    ...(hasError && errorId ? { 'aria-describedby': errorId } : {})
  }),
  
  // 展開可能要素のARIA属性を生成
  getExpandableAria: (isExpanded: boolean, controlsId?: string) => ({
    'aria-expanded': isExpanded,
    ...(controlsId ? { 'aria-controls': controlsId } : {})
  })
};

// 読み上げ用テキスト変換
export const textToSpeech = {
  // 数値を読み上げ用に変換
  formatNumber: (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}百万`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}千`;
    }
    return num.toString();
  },
  
  // 日付を読み上げ用に変換
  formatDate: (date: Date): string => {
    return new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    }).format(date);
  },
  
  // ステータスを読み上げ用に変換
  formatStatus: (status: string): string => {
    const statusMap: Record<string, string> = {
      'active': 'アクティブ',
      'inactive': '非アクティブ',
      'pending': '保留中',
      'completed': '完了',
      'error': 'エラー',
      'warning': '警告',
      'success': '成功'
    };
    return statusMap[status.toLowerCase()] || status;
  }
};

// キーボードイベント処理
export const keyboardHandlers = {
  // Escapeキーハンドラー
  onEscape: (callback: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      callback();
    }
  },
  
  // Enterキーハンドラー
  onEnter: (callback: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      callback();
    }
  },
  
  // スペースキーハンドラー
  onSpace: (callback: () => void) => (e: KeyboardEvent) => {
    if (e.key === ' ') {
      e.preventDefault();
      callback();
    }
  },
  
  // 矢印キーナビゲーション
  onArrowNavigation: (
    onUp: () => void,
    onDown: () => void,
    onLeft?: () => void,
    onRight?: () => void
  ) => (e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        onUp();
        break;
      case 'ArrowDown':
        e.preventDefault();
        onDown();
        break;
      case 'ArrowLeft':
        if (onLeft) {
          e.preventDefault();
          onLeft();
        }
        break;
      case 'ArrowRight':
        if (onRight) {
          e.preventDefault();
          onRight();
        }
        break;
    }
  }
};

// アクセシビリティ監査
export const auditAccessibility = {
  // 画像のalt属性チェック
  checkImageAltText: (): string[] => {
    const issues: string[] = [];
    const images = document.querySelectorAll('img');
    
    images.forEach((img, index) => {
      if (!img.hasAttribute('alt')) {
        issues.push(`画像 ${index + 1}: alt属性が不足しています`);
      } else if (img.getAttribute('alt') === '') {
        const isDecorative = img.hasAttribute('role') && img.getAttribute('role') === 'presentation';
        if (!isDecorative) {
          issues.push(`画像 ${index + 1}: 装飾的画像でない場合はalt属性を設定してください`);
        }
      }
    });
    
    return issues;
  },
  
  // ヘッディング構造チェック
  checkHeadingStructure: (): string[] => {
    const issues: string[] = [];
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const currentLevel = parseInt(heading.tagName.charAt(1));
      
      if (index === 0 && currentLevel !== 1) {
        issues.push('最初のヘッディングはh1である必要があります');
      }
      
      if (currentLevel > previousLevel + 1) {
        issues.push(`ヘッディング ${index + 1}: レベルが飛び級しています (h${previousLevel} → h${currentLevel})`);
      }
      
      previousLevel = currentLevel;
    });
    
    return issues;
  },
  
  // フォームラベルチェック
  checkFormLabels: (): string[] => {
    const issues: string[] = [];
    const inputs = document.querySelectorAll('input, textarea, select');
    
    inputs.forEach((input, index) => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!id || !document.querySelector(`label[for="${id}"]`)) {
        if (!ariaLabel && !ariaLabelledBy) {
          issues.push(`フォーム要素 ${index + 1}: ラベルが関連付けられていません`);
        }
      }
    });
    
    return issues;
  }
};

export default {
  announceToScreenReader,
  trapFocus,
  checkColorContrast,
  isWCAGCompliant,
  manageFocus,
  ariaHelpers,
  textToSpeech,
  keyboardHandlers,
  auditAccessibility
};