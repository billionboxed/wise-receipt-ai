// Capacitor bridge for the SMS feature.
// Android: delegates to a registered native plugin called `SmsReader`
//   (a small Java/Kotlin module exposing readInbox / startListener / stopListener).
// iOS / Web: returns { supported: false } so all callers degrade gracefully.

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { RawSms } from './parser';

export interface SmsReaderPlugin {
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  readInbox(options: { sinceEpochMs?: number; maxCount?: number }): Promise<{ messages: RawSms[] }>;
  startListener(): Promise<{ started: boolean }>;
  stopListener(): Promise<{ stopped: boolean }>;
  addListener(
    eventName: 'smsReceived',
    listenerFunc: (msg: RawSms) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

// registerPlugin returns a proxy even if the native impl is missing.
// We guard at every call site with isSmsSupported().
const SmsReader = registerPlugin<SmsReaderPlugin>('SmsReader');

export function isSmsSupported(): boolean {
  return Capacitor.getPlatform() === 'android' && Capacitor.isNativePlatform();
}

export async function checkSmsPermission(): Promise<boolean> {
  if (!isSmsSupported()) return false;
  try {
    const r = await SmsReader.checkPermission();
    return !!r.granted;
  } catch {
    return false;
  }
}

export async function requestSmsPermission(): Promise<boolean> {
  if (!isSmsSupported()) return false;
  try {
    const r = await SmsReader.requestPermission();
    return !!r.granted;
  } catch {
    return false;
  }
}

export async function readInbox(sinceEpochMs?: number): Promise<RawSms[]> {
  if (!isSmsSupported()) return [];
  try {
    const r = await SmsReader.readInbox({ sinceEpochMs, maxCount: 1000 });
    return r.messages || [];
  } catch (e) {
    console.warn('SMS readInbox failed', e);
    return [];
  }
}

export async function startSmsListener(onSms: (msg: RawSms) => void): Promise<() => void> {
  if (!isSmsSupported()) return () => {};
  try {
    await SmsReader.startListener();
    const handle = await SmsReader.addListener('smsReceived', onSms);
    return async () => {
      try { await handle.remove(); } catch { /* noop */ }
      try { await SmsReader.stopListener(); } catch { /* noop */ }
    };
  } catch (e) {
    console.warn('SMS listener failed', e);
    return () => {};
  }
}