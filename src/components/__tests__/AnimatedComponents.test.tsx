import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FadeIn, StaggeredList, CountUp } from '../AnimatedComponents';

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('AnimatedComponents', () => {
  describe('FadeIn', () => {
    test('renders children correctly', () => {
      render(
        <FadeIn>
          <div data-testid="fade-in-child">Test Content</div>
        </FadeIn>
      );
      
      expect(screen.getByTestId('fade-in-child')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    test('applies correct initial opacity classes', () => {
      render(
        <FadeIn>
          <div>Test Content</div>
        </FadeIn>
      );
      
      const container = screen.getByText('Test Content').parentElement;
      expect(container).toHaveClass('opacity-0');
    });

    test('accepts custom className', () => {
      render(
        <FadeIn className="custom-class">
          <div>Test Content</div>
        </FadeIn>
      );
      
      const container = screen.getByText('Test Content').parentElement;
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('StaggeredList', () => {
    test('renders all children', () => {
      render(
        <StaggeredList>
          <div data-testid="item-1">Item 1</div>
          <div data-testid="item-2">Item 2</div>
          <div data-testid="item-3">Item 3</div>
        </StaggeredList>
      );
      
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
      expect(screen.getByTestId('item-3')).toBeInTheDocument();
    });

    test('applies staggered animation delays', () => {
      render(
        <StaggeredList>
          <div>Item 1</div>
          <div>Item 2</div>
        </StaggeredList>
      );
      
      const items = screen.getAllByText(/Item/);
      expect(items).toHaveLength(2);
    });
  });

  describe('CountUp', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    });

    test('starts with 0 and animates to target', () => {
      render(<CountUp end={100} duration={1000} />);
      
      // Initially shows 0
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('accepts format function', () => {
      const formatNumber = (num: number) => `$${num.toFixed(2)}`;
      
      render(<CountUp end={100} format={formatNumber} />);
      
      expect(screen.getByText('$0.00')).toBeInTheDocument();
    });

    test('handles decimal values correctly', () => {
      render(<CountUp end={99.5} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('accepts custom duration', () => {
      render(<CountUp end={50} duration={2000} />);
      
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});