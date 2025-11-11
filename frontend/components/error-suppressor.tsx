"use client";

import { useEffect } from "react";

/**
 * Suppresses harmless console errors from blocked analytics requests
 * and font preload warnings from third-party libraries
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress network errors from blocked analytics (ad blockers)
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    // Filter error messages
    const shouldSuppressError = (message: string) => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes("err_blocked_by_client") ||
        lowerMessage.includes("pulse.walletconnect.org") ||
        lowerMessage.includes("failed to fetch") ||
        lowerMessage.includes("net::err_blocked_by_client") ||
        lowerMessage.includes("content-script error") ||
        lowerMessage.includes("cannot read properties of null")
      );
    };

    // Filter warning messages
    const shouldSuppressWarn = (message: string) => {
      const lowerMessage = message.toLowerCase();
      return (
        lowerMessage.includes("preloaded using link preload but not used") ||
        lowerMessage.includes("fonts.reown.com") ||
        lowerMessage.includes("khteka-medium.woff2") ||
        lowerMessage.includes("scheduled an update") ||
        lowerMessage.includes("w3m-router-container") ||
        lowerMessage.includes("lit.dev/msg/change-in-update") ||
        lowerMessage.includes("pocket universe is running") ||
        lowerMessage.includes("lit is in dev mode") ||
        lowerMessage.includes("not recommended for production")
      );
    };

    // Filter log messages (WalletConnect metadata warnings)
    const shouldSuppressLog = (message: string) => {
      return (
        message.includes("metadata.url") ||
        message.includes("differs from the actual page url") ||
        message.includes("configured WalletConnect")
      );
    };

    console.error = function (...args: any[]) {
      const message = args.join(" ");
      if (shouldSuppressError(message)) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };

    console.warn = function (...args: any[]) {
      const message = args.join(" ");
      if (shouldSuppressWarn(message)) {
        return; // Silently ignore
      }
      originalWarn.apply(console, args);
    };

    console.log = function (...args: any[]) {
      const message = args.join(" ");
      if (shouldSuppressLog(message)) {
        return; // Silently ignore
      }
      originalLog.apply(console, args);
    };

    // Cleanup on unmount
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      console.log = originalLog;
    };
  }, []);

  return null;
}
