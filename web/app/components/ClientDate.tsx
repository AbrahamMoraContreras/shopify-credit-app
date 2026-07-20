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

  let safeDateString = dateString;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    safeDateString = `${dateString}T12:00:00`;
  }

  const d = new Date(safeDateString);
  return (
    <>{format === "date" ? d.toLocaleDateString() : d.toLocaleString()}</>
  );
}
