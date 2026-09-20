"use client";

// We removed next-auth, so we temporarily remove SessionProvider
export function Providers({ children }) {
  return <>{children}</>;
}
