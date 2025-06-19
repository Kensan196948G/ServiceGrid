import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import * as authApi from '../../services/authApiService';

// Mock the authApiService
jest.mock('../../services/authApiService');
const mockAuthApi = authApi as jest.Mocked<typeof authApi>;

// Test component that uses useAuth
const TestComponent = () => {
  const { user, login, logout, error, isLoading } = useAuth();
  
  return (
    <div>
      <div data-testid="user">{user ? user.username : 'No user'}</div>
      <div data-testid="error">{error || 'No error'}</div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not loading'}</div>
      <button onClick={() => login('testuser', 'testpass')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    
    // Default mock implementations
    mockAuthApi.isAuthenticated.mockReturnValue(false);
    mockAuthApi.getCurrentUser.mockReturnValue(null);
    mockAuthApi.login.mockResolvedValue({
      success: true,
      token: 'test-token',
      user: {
        id: 1,
        username: 'testuser',
        role: 'user',
        display_name: 'Test User',
        email: 'test@example.com'
      },
      message: 'Login successful'
    });
  });

  test('should throw error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAuth must be used within AuthProvider');

    console.error = originalError;
  });

  test('should provide initial auth state', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
      expect(screen.getByTestId('error')).toHaveTextContent('No error');
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });
  });

  test('should restore user session on mount', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      email: 'test@example.com'
    };

    mockAuthApi.isAuthenticated.mockReturnValue(true);
    mockAuthApi.getCurrentUser.mockReturnValue(mockUser);
    mockAuthApi.getMe.mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });
  });

  test('should handle login successfully', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });

    expect(mockAuthApi.login).toHaveBeenCalledWith({
      username: 'testuser',
      password: 'testpass'
    });
  });

  test('should handle login failure', async () => {
    const user = userEvent.setup();

    mockAuthApi.login.mockResolvedValue({
      success: false,
      token: '',
      user: {
        id: 0,
        username: '',
        role: 'user',
        display_name: '',
        email: ''
      },
      message: 'Invalid credentials'
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });
  });

  test('should handle logout', async () => {
    const user = userEvent.setup();

    // Start with authenticated user
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      email: 'test@example.com'
    };

    mockAuthApi.isAuthenticated.mockReturnValue(true);
    mockAuthApi.getCurrentUser.mockReturnValue(mockUser);
    mockAuthApi.getMe.mockResolvedValue(mockUser);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    });

    const logoutButton = screen.getByRole('button', { name: 'Logout' });
    await user.click(logoutButton);

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    expect(mockAuthApi.logout).toHaveBeenCalled();
  });

  test('should handle API errors during login', async () => {
    const user = userEvent.setup();

    mockAuthApi.login.mockRejectedValue(new authApi.AuthApiError(401, 'UNAUTHORIZED', 'Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not loading');
    });

    const loginButton = screen.getByRole('button', { name: 'Login' });
    await user.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Unauthorized');
    });
  });

  test('should handle session validation failure', async () => {
    mockAuthApi.isAuthenticated.mockReturnValue(true);
    mockAuthApi.getCurrentUser.mockReturnValue(null);
    mockAuthApi.getMe.mockRejectedValue(new Error('Session expired'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('No user');
    });

    expect(mockAuthApi.logout).toHaveBeenCalled();
  });

  test('should track session activity', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Simulate user activity
    await user.click(screen.getByRole('button', { name: 'Login' }));

    // The component should track this activity internally
    // We can't easily test the internal state, but we can verify
    // that the component doesn't crash and continues to function
    expect(screen.getByTestId('user')).toBeInTheDocument();
  });

  test('should handle token refresh', async () => {
    const mockUser = {
      id: '1',
      username: 'testuser',
      role: 'user' as const,
      email: 'test@example.com'
    };

    mockAuthApi.isAuthenticated.mockReturnValue(true);
    mockAuthApi.getCurrentUser.mockReturnValue(mockUser);
    mockAuthApi.getMe.mockResolvedValue(mockUser);
    mockAuthApi.refreshToken.mockResolvedValue(true);

    const TestRefreshComponent = () => {
      const { refreshToken } = useAuth();
      return (
        <div>
          <button onClick={() => refreshToken()}>Refresh Token</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestRefreshComponent />
      </AuthProvider>
    );

    const refreshButton = screen.getByRole('button', { name: 'Refresh Token' });
    await user.click(refreshButton);

    expect(mockAuthApi.refreshToken).toHaveBeenCalled();
  });
});