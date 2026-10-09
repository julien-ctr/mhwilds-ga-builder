/// <reference lib="webworker" />
import { getDb } from '../model/db';
import { runGa, type GaOutput, type GaProgress } from './ga';
import type { BuildRequest } from './request';

export type WorkerRequest = { type: 'run'; request: BuildRequest };
export type WorkerResponse =
  | { type: 'progress'; progress: GaProgress }
  | { type: 'done'; output: GaOutput; elapsedMs: number }
  | { type: 'error'; message: string };

// Cancellation is done by terminating the worker from the main thread.
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const post = (msg: WorkerResponse) => self.postMessage(msg);
  try {
    const start = performance.now();
    const output = runGa(getDb(), event.data.request, {
      onProgress: (progress) => post({ type: 'progress', progress }),
    });
    post({ type: 'done', output, elapsedMs: performance.now() - start });
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
