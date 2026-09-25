// @firebase/auth's react-native build exports getReactNativePersistence, but its package.json lists the
// public "types" before the "react-native" condition, so TypeScript never sees it. Declare it here.
import type { Persistence } from "@firebase/auth";

declare module "@firebase/auth" {
  export function getReactNativePersistence(storage: {
    setItem(key: string, value: string): Promise<void>;
    getItem(key: string): Promise<string | null>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
