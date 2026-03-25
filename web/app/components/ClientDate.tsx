import { useState, useEffect } from "react";

interface ClientDateProps {
  dateString: string | null | undefined;
  format?: "date" | "datetime";
  fallback?: string;
}

export function ClientDate({ dateString, format = "date", fallback = "" }: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !dateString) {
    return <>{fallback}</>;
  }

  const d = new Date(dateString);
  return (
    <>{format === "date" ? d.toLocaleDateString() : d.toLocaleString()}</>
  );
}
