import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'nudge.pin';
const SALT_KEY = 'nudge.pin.salt';

export const PIN_LENGTH = 5;

/**
 * The PIN is never stored. A random salt is generated once per device and the
 * SHA-256 of `salt:pin` is kept in the OS keystore, so reading the app's files
 * does not reveal it.
 */
async function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

async function readSalt(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SALT_KEY);
  } catch {
    return null;
  }
}

export async function hasPin(): Promise<boolean> {
  try {
    const stored = await SecureStore.getItemAsync(PIN_KEY);
    return Boolean(stored);
  } catch {
    return false;
  }
}

export async function setPin(pin: string): Promise<void> {
  if (pin.length !== PIN_LENGTH || !/^\d+$/.test(pin)) {
    throw new Error(`The PIN must be ${PIN_LENGTH} digits.`);
  }
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(SALT_KEY, salt);
  await SecureStore.setItemAsync(PIN_KEY, hash);
}

export async function verifyPin(pin: string): Promise<boolean> {
  const [salt, stored] = await Promise.all([readSalt(), SecureStore.getItemAsync(PIN_KEY)]);
  if (!salt || !stored) return false;
  const hash = await hashPin(pin, salt);
  return hash === stored;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY).catch(() => {});
  await SecureStore.deleteItemAsync(SALT_KEY).catch(() => {});
}
