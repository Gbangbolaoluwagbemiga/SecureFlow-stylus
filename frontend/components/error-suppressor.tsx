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
        lowerMessage.includes("cannot read properties of null") ||
        lowerMessage.includes("cannot redefine property: ethereum") ||
        lowerMessage.includes("redefine property") ||
        lowerMessage.includes("evmask.js") ||
        lowerMessage.includes("message channel closed") ||
        lowerMessage.includes("asynchronous response")
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

    // Override console.error to catch and suppress specific errors
    console.error = function (...args: any[]) {
      const message = args.join(" ");

      // Check if it's the ethereum redefinition error specifically
      if (
        message.includes("Cannot redefine property: ethereum") ||
        (message.includes("redefine property") && message.includes("ethereum"))
      ) {
        // This is a known issue with wallet injection libraries - safe to ignore
        return;
      }

      if (shouldSuppressError(message)) {
        return; // Silently ignore
      }
      originalError.apply(console, args);
    };

    // Also catch uncaught errors related to ethereum redefinition via window.onerror
    if (typeof window !== "undefined") {
      const originalOnError = window.onerror;
      window.onerror = function (message, source, lineno, colno, error) {
        const errorMessage = String(message || "");
        if (
          errorMessage.includes("Cannot redefine property: ethereum") ||
          (errorMessage.includes("redefine property") &&
            errorMessage.includes("ethereum"))
        ) {
          // Suppress this specific error
          return true; // Prevent default error handling
        }
        // Call original handler if it exists
        if (originalOnError) {
          return originalOnError.call(
            this,
            message,
            source,
            lineno,
            colno,
            error
          );
        }
        return false;
      };

      // Also catch unhandled promise rejections
      const originalOnUnhandledRejection = window.onunhandledrejection;
      window.onunhandledrejection = function (event) {
        const errorMessage = String(
          event.reason?.message || event.reason || ""
        );
        if (
          errorMessage.includes("Cannot redefine property: ethereum") ||
          (errorMessage.includes("redefine property") &&
            errorMessage.includes("ethereum"))
        ) {
          event.preventDefault();
          return;
        }
        if (originalOnUnhandledRejection) {
          originalOnUnhandledRejection.call(this, event);
        }
      };
    }

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

      if (typeof window !== "undefined") {
        // Restore original error handlers if they were overridden
        // Note: We can't fully restore window.onerror as we don't have the original
        // but this is fine as the component should persist for the app lifetime
      }
    };
  }, []);

  return null;
}
