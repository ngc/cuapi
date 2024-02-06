import React, { useRef, useEffect, useState, ReactNode, useLayoutEffect } from 'react';
import { useStyletron } from 'styletron-react';

interface CutoffHiderProps {
  children: ReactNode;
}

export const CutoffHider: React.FC<CutoffHiderProps> = ({ children }) => {
  const [css] = useStyletron();
  const [isVisible, setIsVisible] = useState(true);
  const parentRef = useRef<HTMLDivElement>(null);
  const childRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const checkBounds = () => {
      if (parentRef.current && childRef.current) {
        const parent = parentRef.current.getBoundingClientRect();
        const child = childRef.current.getBoundingClientRect();

        // Update condition to hide child if any part is out of bounds
        const visible =
          child.left >= parent.left &&
          child.top >= parent.top &&
          child.right <= parent.right &&
          child.bottom <= parent.bottom;

        setIsVisible(visible);
      }
    };

    // Check bounds on mount and window resize
    checkBounds();
    window.addEventListener('resize', checkBounds);

    // Clean up event listener
    return () => window.removeEventListener('resize', checkBounds);
  }, []);

  return (
    <div ref={parentRef} className={css({ width: '100%', height: '100%', position: 'relative' })}>
      <div ref={childRef} className={css({ position: 'absolute', visibility: isVisible ? 'visible' : 'hidden' })}>
        {children}
      </div>
    </div>
  );
};
