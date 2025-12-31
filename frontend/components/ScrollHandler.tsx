'use client';

import { useEffect } from 'react';

/**
 * ScrollHandler Component
 * Handles scroll restoration for Next.js App Router with sticky headers
 * This suppresses the warning about skipping auto-scroll due to sticky elements
 */
export default function ScrollHandler() {
  useEffect(() => {
    // Suppress Next.js scroll restoration warnings for sticky headers
    // This is expected behavior when using sticky headers
    if (typeof window !== 'undefined') {
      // Override console.warn to filter out the specific scroll warning
      const originalWarn = console.warn;
      console.warn = (...args: any[]) => {
        const message = args[0]?.toString() || '';
        // Filter out the specific scroll restoration warning
        if (
          message.includes('Skipping auto-scroll behavior') &&
          message.includes('position: sticky') &&
          message.includes('position: fixed')
        ) {
          // Suppress this specific warning as it's expected behavior
          return;
        }
        // Log other warnings normally
        originalWarn.apply(console, args);
      };

      return () => {
        // Restore original console.warn on unmount
        console.warn = originalWarn;
      };
    }
  }, []);

  return null;
}
