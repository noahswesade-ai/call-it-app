import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Bug reports from the in-app ⚠ button. They're sent to a small Google Apps Script web
 * app (tools/bug-report-script.gs) that appends each one to the "Reported bugs" tab of the
 * Underdog Google Doc. Set its address in EXPO_PUBLIC_BUG_REPORT_URL.
 * Reports that can't be sent (offline, or the address isn't set yet) wait on the phone and
 * are retried the next time a report is sent or the app starts.
 */
const URL = String(process.env.EXPO_PUBLIC_BUG_REPORT_URL ?? '');
const QUEUE_KEY = 'underdog.bugQueue.v1';

export interface BugReport {
  text: string;
  /** Where it happened: screen, room code, game phase and round. */
  context: string;
  name: string;
  at: string;
  device: string;
}

export function bugReportsConfigured(): boolean {
  return URL.startsWith('https://');
}

export function deviceInfo(): string {
  if (Platform.OS === 'web' && typeof navigator !== 'undefined') return `web · ${navigator.userAgent}`;
  return `${Platform.OS} ${String(Platform.Version)}`;
}

async function readQueue(): Promise<BugReport[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) ?? '[]') as BugReport[];
  } catch {
    return [];
  }
}

async function post(r: BugReport): Promise<boolean> {
  if (!bugReportsConfigured()) return false;
  try {
    // text/plain keeps this a "simple" request (no CORS preflight), which Apps Script needs.
    await fetch(URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(r) });
    return true;
  } catch {
    return false;
  }
}

/** Sends a report (and anything still waiting). Returns true if this one was sent now. */
export async function sendBugReport(r: BugReport): Promise<boolean> {
  const waiting = await readQueue();
  const left: BugReport[] = [];
  for (const q of waiting) if (!(await post(q))) left.push(q);
  const ok = await post(r);
  if (!ok) left.push(r);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left.slice(-50))).catch(() => {});
  return ok;
}

/** Retry anything waiting (called once when the app starts). */
export async function flushBugReports(): Promise<void> {
  const waiting = await readQueue();
  if (!waiting.length || !bugReportsConfigured()) return;
  const left: BugReport[] = [];
  for (const q of waiting) if (!(await post(q))) left.push(q);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(left)).catch(() => {});
}
