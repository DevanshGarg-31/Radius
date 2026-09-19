"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Settled<T> = { status: "success"; data: T; error?: undefined } | { status: "error"; data?: undefined; error: unknown };
export type AsyncState<T> = { status: "loading"; data?: undefined; error?: undefined } | Settled<T>;

/**
 * Runs an async loader whenever its dependencies change and exposes a retry.
 * A result only counts for the dependencies it was loaded with, so stale
 * responses never show and the state is "loading" until the current one lands.
 */
export function useAsync<T>(loader: () => Promise<T>, deps: readonly (string | number | boolean | null | undefined)[]): AsyncState<T> & { reload: () => void; setData: (data: T) => void } {
  const [nonce, setNonce] = useState(0);
  const key = `${JSON.stringify(deps)}#${nonce}`;
  const [result, setResult] = useState<{ key: string; state: Settled<T> } | null>(null);

  const loaderRef = useRef(loader);
  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    let active = true;
    loaderRef.current().then(
      (data) => active && setResult({ key, state: { status: "success", data } }),
      (error: unknown) => active && setResult({ key, state: { status: "error", error } }),
    );
    return () => {
      active = false;
    };
  }, [key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setResult({ key, state: { status: "success", data } }), [key]);
  const state: AsyncState<T> = result && result.key === key ? result.state : { status: "loading" };
  return { ...state, reload, setData };
}
