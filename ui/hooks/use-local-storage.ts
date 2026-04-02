import { useCallback, useState, type SetStateAction } from "react";

export function useLocalStorage<T>(key: string, defaultValue: T) {
  const [value, _setValue] = useState<T>(() => {
    try {
      const storedValue = localStorage.getItem(key);
      if (!storedValue) return defaultValue;
      return JSON.parse(storedValue);
    } catch (_error) {
      return defaultValue;
    }
  });

  const setValue = useCallback(
    (newValue: SetStateAction<T>) => {
      localStorage.setItem(key, JSON.stringify(newValue));
      _setValue(newValue);
    },
    [key],
  );

  return [value, setValue] as const;
}
