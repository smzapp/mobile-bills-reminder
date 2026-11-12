import * as Crypto from 'expo-crypto';

/** RFC-4122 v4 identifier used as the primary key for every table. */
export function newId(): string {
  return Crypto.randomUUID();
}
