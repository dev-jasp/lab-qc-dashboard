import * as React from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

type ScrollPosition = {
  x: number;
  y: number;
};

type ScrollPositionMap = Record<string, ScrollPosition>;

const STORAGE_KEY = 'qc_scroll_positions';

function readStoredPositions(): ScrollPositionMap {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);

    if (raw === null) {
      return {};
    }

    const parsed = JSON.parse(raw) as unknown;

    if (typeof parsed !== 'object' || parsed === null) {
      return {};
    }

    return Object.entries(parsed).reduce<ScrollPositionMap>((positions, [key, value]) => {
      if (
        typeof value === 'object' &&
        value !== null &&
        'x' in value &&
        'y' in value &&
        typeof value.x === 'number' &&
        typeof value.y === 'number'
      ) {
        positions[key] = { x: value.x, y: value.y };
      }

      return positions;
    }, {});
  } catch {
    return {};
  }
}

function persistPositions(positions: ScrollPositionMap): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // Ignore storage write failures and fall back to in-memory restoration.
  }
}

export function useRouteScrollRestoration(): void {
  const location = useLocation();
  const navigationType = useNavigationType();
  const positionsRef = React.useRef<ScrollPositionMap>({});

  React.useEffect(() => {
    positionsRef.current = readStoredPositions();
  }, []);

  const savePosition = React.useCallback((key: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    positionsRef.current[key] = {
      x: window.scrollX,
      y: window.scrollY,
    };

    persistPositions(positionsRef.current);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) {
      return;
    }

    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';

    return () => {
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  React.useEffect(() => {
    const handlePageHide = () => {
      savePosition(location.key);
    };

    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [location.key, savePosition]);

  React.useLayoutEffect(() => {
    const savedPosition = positionsRef.current[location.key];

    if (navigationType === 'POP' && savedPosition !== undefined) {
      window.scrollTo({
        left: savedPosition.x,
        top: savedPosition.y,
        behavior: 'auto',
      });
    } else {
      window.scrollTo({
        left: 0,
        top: 0,
        behavior: 'auto',
      });
    }

    return () => {
      savePosition(location.key);
    };
  }, [location.key, navigationType, savePosition]);
}
