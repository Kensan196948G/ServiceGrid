import * as React from 'react';
const { useState, useEffect, memo } = React;

// Fade in animation component
export const FadeIn = memo(({ 
  children, 
  delay = 0, 
  duration = 300,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
});
FadeIn.displayName = 'FadeIn';

// Slide in from left animation
export const SlideInLeft = memo(({ 
  children, 
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all duration-500 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(-50px)'
      }}
    >
      {children}
    </div>
  );
});
SlideInLeft.displayName = 'SlideInLeft';

// Scale up animation
export const ScaleUp = memo(({ 
  children, 
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`transition-all duration-300 ease-out ${className}`}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'scale(1)' : 'scale(0.9)'
      }}
    >
      {children}
    </div>
  );
});
ScaleUp.displayName = 'ScaleUp';

// Stagger animation for lists
export const StaggeredList = memo(({ 
  children, 
  staggerDelay = 100,
  className = ''
}: {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}) => {
  return (
    <div className={className}>
      {React.Children.map(children, (child, index) => (
        <FadeIn key={index} delay={index * staggerDelay}>
          {child}
        </FadeIn>
      ))}
    </div>
  );
});
StaggeredList.displayName = 'StaggeredList';

// Pulse animation for loading states
export const Pulse = memo(({ 
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`animate-pulse ${className}`}>
    {children}
  </div>
));
Pulse.displayName = 'Pulse';

// Bounce animation for alerts
export const Bounce = memo(({ 
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={`animate-bounce ${className}`}>
    {children}
  </div>
));
Bounce.displayName = 'Bounce';

// Hover scale effect
export const HoverScale = memo(({ 
  children,
  scale = 1.05,
  className = ''
}: {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}) => (
  <div 
    className={`transition-transform duration-200 ease-in-out hover:scale-${Math.round(scale * 100)} ${className}`}
    style={{
      '--hover-scale': scale
    } as React.CSSProperties}
  >
    {children}
  </div>
));
HoverScale.displayName = 'HoverScale';

// Loading skeleton component
export const Skeleton = memo(({ 
  width = '100%',
  height = '1rem',
  className = ''
}: {
  width?: string;
  height?: string;
  className?: string;
}) => (
  <div 
    className={`bg-gray-200 rounded animate-pulse ${className}`}
    style={{ width, height }}
  />
));
Skeleton.displayName = 'Skeleton';

// Card with entrance animation
export const AnimatedCard = memo(({ 
  children,
  delay = 0,
  className = ''
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <FadeIn delay={delay}>
    <div className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 ${className}`}>
      {children}
    </div>
  </FadeIn>
));
AnimatedCard.displayName = 'AnimatedCard';

// Progress bar with animation
export const AnimatedProgressBar = memo(({ 
  progress,
  color = 'blue',
  height = '0.5rem',
  className = ''
}: {
  progress: number;
  color?: string;
  height?: string;
  className?: string;
}) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <div className={`w-full bg-gray-200 rounded-full ${className}`} style={{ height }}>
      <div 
        className={`bg-${color}-500 h-full rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${Math.min(100, Math.max(0, animatedProgress))}%` }}
      />
    </div>
  );
});
AnimatedProgressBar.displayName = 'AnimatedProgressBar';

// Number counter animation
export const CountUp = memo(({ 
  end,
  duration = 1000,
  suffix = '',
  className = ''
}: {
  end: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    const startCount = 0;
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      
      const easedProgress = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const currentCount = Math.round(startCount + (end - startCount) * easedProgress);
      
      setCount(currentCount);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [end, duration]);

  return (
    <span className={className}>
      {count.toLocaleString()}{suffix}
    </span>
  );
});
CountUp.displayName = 'CountUp';