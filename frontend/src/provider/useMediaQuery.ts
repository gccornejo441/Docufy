import { useEffect, useState } from "react";

type LegacyMQL = MediaQueryList & {
  addListener?: (
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void
  ) => void;
  removeListener?: (
    listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void
  ) => void;
};

export function useMediaQuery(query: string): boolean {
  const getMatches = (q: string): boolean => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia === "undefined"
    )
      return false;
    return window.matchMedia(q).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatches(query));

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia === "undefined"
    )
      return;

    const mql = window.matchMedia(query) as LegacyMQL;
    const handler = () => setMatches(mql.matches);

    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
    } else {
      // legacy Safari
      mql.addListener?.(handler);
    }

    setMatches(mql.matches);

    return () => {
      if (typeof mql.removeEventListener === "function") {
        mql.removeEventListener("change", handler);
      } else {
        // legacy Safari
        mql.removeListener?.(handler);
      }
    };
  }, [query]);

  return matches;
}
