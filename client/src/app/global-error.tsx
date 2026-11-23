"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center p-4 text-center font-sans">
        <h1 className="text-3xl font-bold">Something went wrong</h1>
        <p className="mt-2 text-sm text-gray-500">
          A critical error occurred. Please try reloading the page.
        </p>
        <button
          onClick={() => reset()}
          className="mt-6 px-4 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800"
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
