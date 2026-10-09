import { useMemo } from 'react';
import type { Db } from '../model/db';
import type { Weapon } from '../model/types';
import { hornCatalog, weaponMatches, type WeaponOptions } from '../weapons/specifics';
import { CheckboxGroup, toggle } from './Chips';
import { T } from './strings.fr';

/** "Onde d'écho (Contondant)" → "Contondant". */
export function shortEchoWave(name: string): string {
  return name.match(/\(([^)]+)\)\s*$/)?.[1] ?? name;
}

interface Props {
  db: Db;
  /** Horns still allowed by the other filters (rarity, blacklist), used for live match counts. */
  pool: Weapon[];
  options: WeaponOptions;
  set: (o: WeaponOptions) => void;
}

/** Hunting horn constraints: required songs, echo bubble and echo wave. */
export function HornPanel({ db, pool, options, set }: Props) {
  const catalog = useMemo(() => hornCatalog(db.weaponsByKind.get('hunting-horn') ?? []), [db]);
  const chosen = options.songs ?? [];
  /** Horns that would match if `patch` were applied to the current options. */
  const countWith = (patch: WeaponOptions) => pool.filter((h) => weaponMatches(h, { ...options, ...patch })).length;
  const songCounts = Object.fromEntries(catalog.songs.map((s) => [s.name, countWith({ songs: [...chosen, s.name] })]));
  const bubbleCounts = Object.fromEntries(catalog.echoBubbles.map((b) => [b.kind, countWith({ echoBubbles: [b.kind] })]));
  const waveCounts = Object.fromEntries(catalog.echoWaves.map((w) => [w.kind, countWith({ echoWaves: [w.kind] })]));
  const bubbleLabels = Object.fromEntries(catalog.echoBubbles.map((b) => [b.kind, b.name]));
  const waveLabels = Object.fromEntries(catalog.echoWaves.map((w) => [w.kind, shortEchoWave(w.name)]));

  return (
    <>
      <div className="field">
        <span className="label">{T.hornSongs}</span>
        <select
          value=""
          onChange={(e) => e.target.value && set({ ...options, songs: [...chosen, e.target.value] })}
        >
          <option value="">{T.addSong}</option>
          {catalog.songs
            .filter((s) => !chosen.includes(s.name))
            .map((s) => (
              <option key={s.name} value={s.name} disabled={songCounts[s.name] === 0}>
                {s.name} ({T.hornsCount(songCounts[s.name])})
              </option>
            ))}
        </select>
        {chosen.length > 0 && (
          <div className="chips">
            {chosen.map((name) => (
              <span key={name} className="chip chip-on">
                {name}
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`${T.remove} : ${name}`}
                  title={T.remove}
                  onClick={() => set({ ...options, songs: chosen.filter((s) => s !== name) })}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}
        <small className="hint">{T.allSongsRequired}</small>
      </div>

      <div className="field">
        <span className="label">{T.echoBubble}</span>
        <CheckboxGroup
          values={catalog.echoBubbles.map((b) => b.kind)}
          labels={bubbleLabels}
          selected={options.echoBubbles}
          counts={bubbleCounts}
          onToggle={(v) => set({ ...options, echoBubbles: toggle(options.echoBubbles, v) })}
        />
      </div>

      <div className="field">
        <span className="label">{T.echoWave}</span>
        <CheckboxGroup
          values={catalog.echoWaves.map((w) => w.kind)}
          labels={waveLabels}
          selected={options.echoWaves}
          counts={waveCounts}
          onToggle={(v) => set({ ...options, echoWaves: toggle(options.echoWaves, v) })}
        />
        <small className="hint">{T.anyEcho}</small>
      </div>
    </>
  );
}
