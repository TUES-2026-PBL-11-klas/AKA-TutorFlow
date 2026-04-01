"use client";

import { useEffect, useState } from "react";

export function AuthCard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={`auth-card${mounted ? " visible" : ""}`}>{children}</div>
  );
}
