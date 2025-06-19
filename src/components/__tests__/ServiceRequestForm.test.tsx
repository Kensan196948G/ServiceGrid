import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceRequestForm from '../ServiceRequestForm';
import { useToast } from '../../hooks/useToast';

// Mock hooks
jest.mock('../../hooks/useToast');
const mockAddToast = jest.fn();
(useToast as jest.Mock).mockReturnValue({ addToast: mockAddToast });

// Mock CommonUI components
jest.mock('../CommonUI', () => ({
  Button: ({ children, onClick, type, variant, disabled }: any) => (
    <button
      onClick={onClick}
      type={type}
      className={`btn-${variant}`}
      disabled={disabled}
      data-testid={`button-${variant || 'default'}`}
    >
      {children}
    </button>
  ),
  Input: ({ label, name, value, onChange, error, required, placeholder, type, min, step }: any) => (
    <div>
      <label htmlFor={name}>{label} {required && '*'}</label>
      <input
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        type={type || 'text'}
        placeholder={placeholder}
        min={min}
        step={step}
        data-testid={`input-${name}`}
      />
      {error && <span data-testid={`error-${name}`} className="error">{error}</span>}
    </div>
  ),
  Textarea: ({ label, name, value, onChange, error, required, placeholder, rows }: any) => (
    <div>
      <label htmlFor={name}>{label} {required && '*'}</label>
      <textarea
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        data-testid={`textarea-${name}`}
      />
      {error && <span data-testid={`error-${name}`} className="error">{error}</span>}
    </div>
  ),
  Select: ({ label, name, value, onChange, options, error, required }: any) => (
    <div>
      <label htmlFor={name}>{label} {required && '*'}</label>
      <select
        id={name}
        name={name}
        value={value || ''}
        onChange={onChange}
        data-testid={`select-${name}`}
      >
        {options?.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span data-testid={`error-${name}`} className="error">{error}</span>}
    </div>
  )
}));

describe('ServiceRequestForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    isLoading: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form fields correctly', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    expect(screen.getByTestId('input-subject')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-detail')).toBeInTheDocument();
    expect(screen.getByTestId('select-category')).toBeInTheDocument();
    expect(screen.getByTestId('select-priority')).toBeInTheDocument();
    expect(screen.getByTestId('input-requested_item')).toBeInTheDocument();
    expect(screen.getByTestId('textarea-business_justification')).toBeInTheDocument();
    expect(screen.getByTestId('input-estimated_cost')).toBeInTheDocument();
    expect(screen.getByTestId('input-requested_delivery_date')).toBeInTheDocument();
  });

  it('displays required field indicators', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    expect(screen.getByText('件名 *')).toBeInTheDocument();
    expect(screen.getByText('詳細 *')).toBeInTheDocument();
    expect(screen.getByText('優先度 *')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    const initialData = {
      subject: 'Test Request',
      detail: 'Test Description',
      priority: 'High',
      category: 'アカウント作成'
    };

    render(<ServiceRequestForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByTestId('input-subject')).toHaveValue('Test Request');
    expect(screen.getByTestId('textarea-detail')).toHaveValue('Test Description');
    expect(screen.getByTestId('select-priority')).toHaveValue('High');
    expect(screen.getByTestId('select-category')).toHaveValue('アカウント作成');
  });

  it('shows validation errors for required fields', async () => {
    render(<ServiceRequestForm {...defaultProps} />);

    const submitButton = screen.getByTestId('button-primary');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('入力内容を確認してください', 'error');
    });
  });

  it('handles form submission with valid data', async () => {
    render(<ServiceRequestForm {...defaultProps} />);

    // Fill in required fields
    fireEvent.change(screen.getByTestId('input-subject'), {
      target: { value: 'Valid Request Subject' }
    });
    fireEvent.change(screen.getByTestId('textarea-detail'), {
      target: { value: 'Valid detailed description for the request' }
    });

    const submitButton = screen.getByTestId('button-primary');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Valid Request Subject',
          detail: 'Valid detailed description for the request',
          priority: 'Medium',
          status: 'Submitted'
        })
      );
    });
  });

  it('calls onCancel when cancel button is clicked', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    const cancelButton = screen.getByTestId('button-secondary');
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('clears field errors when user starts typing', async () => {
    render(<ServiceRequestForm {...defaultProps} />);

    // Try to submit to trigger validation errors
    const submitButton = screen.getByTestId('button-primary');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('入力内容を確認してください', 'error');
    });

    // Start typing in subject field
    fireEvent.change(screen.getByTestId('input-subject'), {
      target: { value: 'Test' }
    });

    // Error should be cleared (this test assumes error clearing logic works)
    await waitFor(() => {
      const errorElement = screen.queryByTestId('error-subject');
      expect(errorElement).not.toBeInTheDocument();
    });
  });

  it('shows status field for existing requests', () => {
    const initialData = { id: 1, subject: 'Existing Request' };

    render(<ServiceRequestForm {...defaultProps} initialData={initialData} />);

    expect(screen.getByTestId('select-status')).toBeInTheDocument();
  });

  it('hides status field for new requests', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    expect(screen.queryByTestId('select-status')).not.toBeInTheDocument();
  });

  it('handles loading state correctly', () => {
    render(<ServiceRequestForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByTestId('button-primary');
    const cancelButton = screen.getByTestId('button-secondary');

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('保存中...');
  });

  it('shows correct button text for edit vs create', () => {
    // Test create mode
    const { rerender } = render(<ServiceRequestForm {...defaultProps} />);
    expect(screen.getByTestId('button-primary')).toHaveTextContent('作成');

    // Test edit mode
    rerender(<ServiceRequestForm {...defaultProps} initialData={{ id: 1 }} />);
    expect(screen.getByTestId('button-primary')).toHaveTextContent('更新');
  });

  it('handles form field changes correctly', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    const subjectInput = screen.getByTestId('input-subject');
    fireEvent.change(subjectInput, { target: { value: 'New Subject' } });

    expect(subjectInput).toHaveValue('New Subject');
  });

  it('handles numeric input for estimated cost', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    const costInput = screen.getByTestId('input-estimated_cost');
    fireEvent.change(costInput, { target: { value: '1000.50' } });

    expect(costInput).toHaveValue('1000.50');
  });

  it('handles date input for requested delivery date', () => {
    render(<ServiceRequestForm {...defaultProps} />);

    const dateInput = screen.getByTestId('input-requested_delivery_date');
    fireEvent.change(dateInput, { target: { value: '2024-12-31' } });

    expect(dateInput).toHaveValue('2024-12-31');
  });
});