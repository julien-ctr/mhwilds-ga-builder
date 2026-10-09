import { useCallback, useEffect, useRef, useState } from 'react';
import { getDb } from '../model/db';
import { weaponMatches } from '../weapons/specifics';
import {
  DEFAULT_GA,
  DEFAULT_OBJECTIVES,
  EMPTY_BLACKLIST,
  MAX_RARITY,
  inRarityRange,
  type BlacklistCategory,
  type BuildRequest,
} from '../engine/request';
import { BlacklistPanel, toggleBlacklist } from './Blacklist';
import type { GaOutput, GaProgress } from '../engine/ga';
import type { WorkerRequest, WorkerResponse } from '../engine/worker';
import { WeaponPicker } from './WeaponPicker';
import { SkillPicker } from './SkillPicker';
import { OptionsPanel } from './OptionsPanel';
import { Results } from './Results';
import { T } from './strings.fr';

const db = getDb();
const STORAGE_KEY = 'mhwgb.request.v1';

const DEFAULT_REQUEST: BuildRequest = {
  weaponKind: 'gunlance',
  weaponOptions: {},
  lockedWeaponId: null,
  skills: [],
  rank: 'high',
  minRarity: 1,
  maxRarity: MAX_RARITY,
  objectives: DEFAULT_OBJECTIVES,
  ga: DEFAULT_GA,
  blacklist: EMPTY_BLACKLIST,
};

function loadRequest(): BuildRequest {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REQUEST;
    const saved = JSON.parse(raw) as Partial<BuildRequest>;
    return {
      ...DEFAULT_REQUEST,
      ...saved,
      objectives: { ...DEFAULT_OBJECTIVES, ...saved.objectives },
      ga: { ...DEFAULT_GA, ...saved.ga },
      blacklist: { ...EMPTY_BLACKLIST, ...saved.blacklist },
      skills: (saved.skills ?? []).filter((s) => db.skill(s.id)),
    };
  } catch {
    return DEFAULT_REQUEST;
  }
}

/** Drops a locked weapon that no longer matches the current filters or is blacklisted. */
function sanitize(req: BuildRequest): BuildRequest {
  if (req.lockedWeaponId === null) return req;
  const w = db.weaponsById.get(req.lockedWeaponId);
  const ok =
    w &&
    w.kind === req.weaponKind &&
    inRarityRange(w, req) &&
    !req.blacklist.weapons.includes(w.id) &&
    weaponMatches(w, req.weaponOptions);
  return ok ? req : { ...req, lockedWeaponId: null };
}

type Status =
  | { kind: 'idle' }
  | { kind: 'running'; progress: GaProgress | null }
  | { kind: 'done'; output: GaOutput; elapsedMs: number; request: BuildRequest }
  | { kind: 'error'; message: string };

export function App() {
  const [request, setRequest] = useState<BuildRequest>(loadRequest);
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const [lastDone, setLastDone] = useState<Extract<Status, { kind: 'done' }> | null>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(request));
    } catch {
      // Storage unavailable (private mode…): the app works without it.
    }
  }, [request]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  const patch = useCallback((p: Partial<BuildRequest>) => setRequest((r) => ({ ...r, ...p })), []);
  const onToggleBlacklist = useCallback(
    (category: BlacklistCategory, id: number) =>
      setRequest((r) => ({ ...r, blacklist: toggleBlacklist(r.blacklist, category, id) })),
    [],
  );
  const blacklistChanged =
    lastDone !== null && JSON.stringify(lastDone.request.blacklist) !== JSON.stringify(request.blacklist);

  const run = () => {
    workerRef.current?.terminate();
    const req = sanitize(request);
    const worker = new Worker(new URL('../engine/worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    setStatus({ kind: 'running', progress: null });
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const msg = e.data;
      if (msg.type === 'progress') setStatus({ kind: 'running', progress: msg.progress });
      else {
        worker.terminate();
        workerRef.current = null;
        if (msg.type === 'done') {
          const done = { kind: 'done' as const, output: msg.output, elapsedMs: msg.elapsedMs, request: req };
          setStatus(done);
          setLastDone(done);
        } else setStatus({ kind: 'error', message: msg.message });
      }
    };
    worker.onerror = (e) => setStatus({ kind: 'error', message: e.message });
    worker.postMessage({ type: 'run', request: req } satisfies WorkerRequest);
  };

  const cancel = () => {
    workerRef.current?.terminate();
    workerRef.current = null;
    setStatus({ kind: 'idle' });
  };

  const running = status.kind === 'running';
  const progress = running ? status.progress : null;

  return (
    <div className="app">
      <header className="app-head">
        <h1>{T.appTitle}</h1>
        <p className="app-subtitle">{T.appSubtitle}</p>
        <p className="app-data">
          {T.dataVersion} {new Date(db.data.version).toLocaleDateString('fr-FR')} · wilds.mhdb.io
        </p>
      </header>

      <main className="layout">
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            if (!running) run();
          }}
        >
          <WeaponPicker db={db} request={request} onChange={patch} />
          <SkillPicker db={db} selected={request.skills} onChange={(skills) => patch({ skills })} />
          <BlacklistPanel db={db} blacklist={request.blacklist} onChange={(blacklist) => patch({ blacklist })} />
          <OptionsPanel db={db} request={request} onChange={patch} />
          <div className="actions">
            {running ? (
              <button type="button" className="btn secondary" onClick={cancel}>
                {T.cancel}
              </button>
            ) : (
              <button type="submit" className="btn primary">
                {T.run}
              </button>
            )}
          </div>
        </form>

        <section className="output">
          {running && (
            <div className="progress">
              <div className="progress-text">
                <strong>{T.searching}</strong>
                {progress && (
                  <>
                    <span className="muted">{T.generation(progress.generation, progress.totalGenerations)}</span>
                    <span className={progress.bestMissing === 0 ? 'ok-text' : 'muted'}>
                      {T.bestMissing(progress.bestMissing)}
                    </span>
                  </>
                )}
                {lastDone && <span className="muted progress-note">{T.previousResults}</span>}
              </div>
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${progress ? (progress.generation / progress.totalGenerations) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
          {status.kind === 'error' && <p className="notice notice-ko">{status.message}</p>}
          {lastDone ? (
            lastDone.output.results.length ? (
              <>
                {blacklistChanged && !running && (
                  <div className="notice" role="status">
                    <span className="notice-mark" aria-hidden="true">
                      !
                    </span>
                    <span>{T.blacklistChanged}</span>
                    <button type="button" className="notice-btn" onClick={run}>
                      {T.rerun}
                    </button>
                  </div>
                )}
                <Results
                  db={db}
                  results={lastDone.output.results}
                  requested={lastDone.request.skills}
                  requiredSongs={lastDone.request.weaponOptions.songs ?? []}
                  meta={T.runMeta(lastDone.elapsedMs, lastDone.output.generations, lastDone.output.evaluations)}
                  blacklist={request.blacklist}
                  onToggleBlacklist={onToggleBlacklist}
                />
              </>
            ) : (
              <p className="empty">{T.noResults}</p>
            )
          ) : (
            !running && (
              <p className="empty">
                <span className="diamond" aria-hidden="true" />
                {T.emptyState}
              </p>
            )
          )}
        </section>
      </main>
    </div>
  );
}
