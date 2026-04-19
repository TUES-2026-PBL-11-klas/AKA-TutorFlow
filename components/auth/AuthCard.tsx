"use client";

import { useEffect, useRef } from "react";

export function AuthCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.classList.add("visible");
  }, []);

  return (
    <div ref={ref} className="auth-card">{children}</div>
  );
}
