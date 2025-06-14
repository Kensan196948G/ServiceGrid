/**
 * CommonUI コンポーネントのテスト
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { 
  Button, 
  Input, 
  Select, 
  Modal, 
  Table, 
  Spinner, 
  Card,
  Notification,
  NotificationType,
  EmptyState 
} from '../CommonUI';

// Button コンポーネントのテスト
describe('Button', () => {
  test('基本的なレンダリング', () => {
    render(<Button>テストボタン</Button>);
    const button = screen.getByRole('button', { name: 'テストボタン' });
    expect(button).toBeInTheDocument();
  });

  test('variant プロップによるスタイル変更', () => {
    const { rerender } = render(<Button variant="primary">Primary</Button>);
    let button = screen.getByRole('button');
    expect(button).toHaveClass('bg-blue-600');

    rerender(<Button variant="danger">Danger</Button>);
    button = screen.getByRole('button');
    expect(button).toHaveClass('bg-red-600');
  });

  test('ローディング状態の表示', () => {
    render(<Button isLoading>Loading Button</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  test('クリックイベント', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disabled 状態', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Disabled Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });
});

// Input コンポーネントのテスト
describe('Input', () => {
  test('基本的なレンダリング', () => {
    render(<Input placeholder="テスト入力" />);
    const input = screen.getByPlaceholderText('テスト入力');
    expect(input).toBeInTheDocument();
  });

  test('ラベル付きInput', () => {
    render(<Input label="ユーザー名" id="username" />);
    const label = screen.getByText('ユーザー名');
    const input = screen.getByLabelText('ユーザー名');
    
    expect(label).toBeInTheDocument();
    expect(input).toBeInTheDocument();
  });

  test('必須マーク表示', () => {
    render(<Input label="必須フィールド" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
    expect(asterisk).toHaveClass('text-red-500');
  });

  test('エラー表示', () => {
    render(<Input error="入力エラーです" />);
    const errorMessage = screen.getByText('入力エラーです');
    expect(errorMessage).toBeInTheDocument();
    expect(errorMessage).toHaveClass('text-red-600');
  });

  test('値の入力', async () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await userEvent.type(input, 'テスト値');
    
    expect(input).toHaveValue('テスト値');
  });
});

// Spinner コンポーネントのテスト
describe('Spinner', () => {
  test('基本的なレンダリング', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  test('サイズバリエーション', () => {
    const { rerender } = render(<Spinner size="sm" />);
    let spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-4 h-4');

    rerender(<Spinner size="lg" />);
    spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('w-12 h-12');
  });
});

// EmptyState コンポーネントのテスト
describe('EmptyState', () => {
  test('デフォルトの空状態表示', () => {
    render(<EmptyState />);
    expect(screen.getByText('データがありません')).toBeInTheDocument();
    expect(screen.getByText('現在表示できるデータがありません。')).toBeInTheDocument();
  });

  test('カスタムメッセージ', () => {
    render(
      <EmptyState 
        title="検索結果なし" 
        description="条件に一致するアイテムが見つかりませんでした。"
      />
    );
    
    expect(screen.getByText('検索結果なし')).toBeInTheDocument();
    expect(screen.getByText('条件に一致するアイテムが見つかりませんでした。')).toBeInTheDocument();
  });

  test('アクションボタン付き', () => {
    const action = <Button>新規作成</Button>;
    render(<EmptyState action={action} />);
    expect(screen.getByRole('button', { name: '新規作成' })).toBeInTheDocument();
  });
});