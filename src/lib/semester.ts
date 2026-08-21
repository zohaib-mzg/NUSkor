"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "nuskor_selected_semester";

function currentSemester(): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const term =
    month >= 7 || month <= 0
      ? "Fall"
      : month <= 4
        ? "Spring"
        : "Summer";
  return `${term} ${year}`;
}

export function useSemester(): [string, (s: string) => void] {
  const [semester, setSemester] = useState<string>(() => {
    if (typeof window === "undefined") return currentSemester();
    return (
      localStorage.getItem(STORAGE_KEY) ?? currentSemester()
    );
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, semester);
  }, [semester]);

  return [semester, setSemester];
}

export { currentSemester };
