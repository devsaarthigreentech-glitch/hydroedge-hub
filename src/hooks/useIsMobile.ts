"use client";

import { useState, useEffect } from "react";

/**
 * Hook to detect mobile viewport.
 * Returns true when screen width is <= breakpoint (default 768px).
 */
export function useIsMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= breakpoint);
    check(); // initial check
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}
