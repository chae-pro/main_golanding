"use client";

import Link, { type LinkProps } from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type PropsWithChildren,
} from "react";

type NavigationProgressContextValue = {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
};

const NavigationProgressContext = createContext<NavigationProgressContextValue | null>(null);

export function NavigationProgressProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    if (!isNavigating) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIsNavigating(false);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [pathname, searchParams, isNavigating]);

  const value = useMemo<NavigationProgressContextValue>(
    () => ({
      isNavigating,
      startNavigation: () => setIsNavigating(true),
      stopNavigation: () => setIsNavigating(false),
    }),
    [isNavigating],
  );

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
      <div
        aria-hidden="true"
        className={`navigation-progress ${isNavigating ? "navigation-progress-active" : ""}`}
      />
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress() {
  const context = useContext(NavigationProgressContext);

  if (!context) {
    throw new Error("NavigationProgressProvider is required");
  }

  return context;
}

type AppLinkProps = LinkProps & {
  className?: string;
  children: React.ReactNode;
  target?: string;
  prefetch?: boolean | null;
};

export function AppLink({ children, onClick, target, ...props }: AppLinkProps & {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const { startNavigation } = useNavigationProgress();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (
      event.defaultPrevented ||
      target === "_blank" ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    startNavigation();
  }

  return (
    <Link {...props} onClick={handleClick} target={target}>
      {children}
    </Link>
  );
}

export function useNavigationPush() {
  const router = useRouter();
  const { startNavigation } = useNavigationProgress();

  return {
    push: (href: string) => {
      startNavigation();
      router.push(href);
    },
    replace: (href: string) => {
      startNavigation();
      router.replace(href);
    },
  };
}
