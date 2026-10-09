import { useMemo, type CSSProperties } from 'react';
import type { Db } from '../model/db';
import type { ShellType, Weapon, WeaponKind } from '../model/types';
import { inRarityRange, type BuildRequest } from '../engine/request';
import { MAX_SHELL_LEVEL, weaponMatches, type WeaponOptions } from '../weapons/specifics';
import {
  CHARGE_BLADE_PHIAL_LABELS,
  COATING_LABELS,
  ELEMENT_LABELS,
  SHELL_LABELS,
  SWITCH_AXE_PHIAL_LABELS,
  T,
  WEAPON_KIND_LABELS,
} from './strings.fr';
import { compareFr } from './format';
import { CheckboxGroup, toggle } from './Chips';
import { HornPanel, shortEchoWave } from './HornPanel';
import { Panel } from './Panel';

/** Range input styled as a forged rail with a diamond handle and tick labels. */
function LevelSlider({
  label,
  min,
  max,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className="field">
      <span className="label label-row">
        <span>{label}</span>
        <strong>{value}</strong>
      </span>
      <input
        type="range"
        className="slider"
        min={min}
        max={max}
        value={value}
        style={{ '--pct': `${pct}%` } as CSSProperties}
        onChange={(e) => onChange(+e.target.value)}
      />
      <span className="ticks" aria-hidden="true">
        {Array.from({ length: max - min + 1 }, (_, i) => (
          <span key={i}>{min + i}</span>
        ))}
      </span>
    </label>
  );
}

interface Props {
  db: Db;
  request: BuildRequest;
  onChange: (patch: Partial<BuildRequest>) => void;
}

const WEAPON_KINDS = (Object.keys(WEAPON_KIND_LABELS) as WeaponKind[]).sort((a, b) =>
  compareFr(WEAPON_KIND_LABELS[a], WEAPON_KIND_LABELS[b]),
);

/** Short French summary of a weapon's type-specific attribute (shelling, phial…). */
export function weaponSpecificLabel(w: Weapon): string | null {
  const s = w.specifics;
  switch (s.kind) {
    case 'gunlance':
      return `${T.shell} ${SHELL_LABELS[s.shell]} niv. ${s.shellLevel}`;
    case 'charge-blade':
      return CHARGE_BLADE_PHIAL_LABELS[s.phial] ?? s.phial;
    case 'switch-axe':
      return (SWITCH_AXE_PHIAL_LABELS[s.phial] ?? s.phial) + (s.phialDamage ? ` ${s.phialDamage}` : '');
    case 'insect-glaive':
      return `${T.kinsect} niv. ${s.kinsectLevel}`;
    case 'hunting-horn':
      return [s.echoBubble && `${T.echoBubble} : ${s.echoBubble.name}`, s.echoWave && `${T.echoWave} : ${shortEchoWave(s.echoWave.name)}`]
        .filter(Boolean)
        .join(' · ') || null;
    default:
      return null;
  }
}

export function weaponElementLabel(w: Weapon): string | null {
  if (!w.specials.length) return null;
  return w.specials
    .map((s) => `${ELEMENT_LABELS[s.type] ?? s.type} ${s.hidden ? `(${s.value})` : s.value}`)
    .join(', ');
}

interface SpecificsPanelProps {
  db: Db;
  kind: WeaponKind;
  /** Weapons of this kind allowed by non-specific filters (rarity, blacklist). */
  pool: Weapon[];
  options: WeaponOptions;
  set: (o: WeaponOptions) => void;
}

function SpecificsPanel({ db, kind, pool, options, set }: SpecificsPanelProps) {
  /** Weapons that would match if `patch` were applied to the current options. */
  const countWith = (patch: WeaponOptions) => pool.filter((w) => weaponMatches(w, { ...options, ...patch })).length;
  const countsFor = (values: string[], patch: (v: string) => WeaponOptions) =>
    Object.fromEntries(values.map((v) => [v, countWith(patch(v))]));
  switch (kind) {
    case 'hunting-horn':
      return <HornPanel db={db} pool={pool} options={options} set={set} />;
    case 'gunlance':
      return (
        <>
          <div className="field">
            <span className="label">{T.shellType}</span>
            <CheckboxGroup
              values={['normal', 'wide', 'long'] as ShellType[]}
              labels={SHELL_LABELS}
              selected={options.shells}
              counts={countsFor(['normal', 'wide', 'long'], (v) => ({ shells: [v as ShellType] }))}
              onToggle={(v) => set({ ...options, shells: toggle(options.shells, v) })}
            />
            <small className="hint">{T.anyShell}</small>
          </div>
          <LevelSlider
            label={T.minShellLevel}
            min={1}
            max={MAX_SHELL_LEVEL}
            value={options.minShellLevel ?? 1}
            onChange={(v) => set({ ...options, minShellLevel: v })}
          />
          <label className="check">
            <input
              type="checkbox"
              checked={!!options.preferShellLevel}
              onChange={(e) => set({ ...options, preferShellLevel: e.target.checked })}
            />
            {T.preferShellLevel}
          </label>
        </>
      );
    case 'charge-blade':
    case 'switch-axe': {
      const labels = kind === 'charge-blade' ? CHARGE_BLADE_PHIAL_LABELS : SWITCH_AXE_PHIAL_LABELS;
      return (
        <div className="field">
          <span className="label">{T.phialType}</span>
          <CheckboxGroup
            values={Object.keys(labels)}
            labels={labels}
            selected={options.phials}
            counts={countsFor(Object.keys(labels), (v) => ({ phials: [v] }))}
            onToggle={(v) => set({ ...options, phials: toggle(options.phials, v) })}
          />
          <small className="hint">{T.anyPhial}</small>
        </div>
      );
    }
    case 'insect-glaive':
      return (
        <LevelSlider
          label={T.minKinsectLevel}
          min={1}
          max={10}
          value={options.minKinsectLevel ?? 1}
          onChange={(v) => set({ ...options, minKinsectLevel: v })}
        />
      );
    case 'bow':
      return (
        <div className="field">
          <span className="label">{T.requiredCoatings}</span>
          <CheckboxGroup
            values={Object.keys(COATING_LABELS)}
            labels={COATING_LABELS}
            selected={options.coatings}
            counts={countsFor(Object.keys(COATING_LABELS), (v) => ({
              coatings: [...new Set([...(options.coatings ?? []), v])],
            }))}
            onToggle={(v) => set({ ...options, coatings: toggle(options.coatings, v) })}
          />
        </div>
      );
    default:
      return null;
  }
}

export function WeaponPicker({ db, request, onChange }: Props) {
  const pool = useMemo(
    () =>
      (db.weaponsByKind.get(request.weaponKind) ?? []).filter(
        (w) => inRarityRange(w, request) && !request.blacklist.weapons.includes(w.id),
      ),
    [db, request.weaponKind, request.minRarity, request.maxRarity, request.blacklist.weapons],
  );
  const matching = useMemo(
    () =>
      pool
        .filter((w) => weaponMatches(w, request.weaponOptions))
        .sort((a, b) => b.rarity - a.rarity || b.attack - a.attack),
    [pool, request.weaponOptions],
  );
  const lockedStillValid = request.lockedWeaponId === null || matching.some((w) => w.id === request.lockedWeaponId);

  return (
    <Panel title={T.weaponSection}>
      <label className="field">
        <span className="label">{T.weaponType}</span>
        <select
          value={request.weaponKind}
          onChange={(e) =>
            onChange({ weaponKind: e.target.value as WeaponKind, weaponOptions: {}, lockedWeaponId: null })
          }
        >
          {WEAPON_KINDS.map((k) => (
            <option key={k} value={k}>
              {WEAPON_KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </label>

      <SpecificsPanel
        db={db}
        kind={request.weaponKind}
        pool={pool}
        options={request.weaponOptions}
        set={(weaponOptions) => onChange({ weaponOptions })}
      />

      <label className="field">
        <span className="label">{T.lockedWeapon}</span>
        <select
          value={lockedStillValid ? (request.lockedWeaponId ?? '') : ''}
          onChange={(e) => onChange({ lockedWeaponId: e.target.value === '' ? null : +e.target.value })}
        >
          <option value="">{T.anyWeapon}</option>
          {matching.map((w) => {
            const extra = [weaponSpecificLabel(w), weaponElementLabel(w)].filter(Boolean).join(' · ');
            return (
              <option key={w.id} value={w.id}>
                {`★${w.rarity} ${w.name} – ${T.attack} ${w.attack}${extra ? ` · ${extra}` : ''}`}
              </option>
            );
          })}
        </select>
        {matching.length === 0 ? (
          <span className="warn">{T.noMatchingWeapon}</span>
        ) : (
          <small className="hint">{T.matchingWeapons(matching.length)}</small>
        )}
      </label>
    </Panel>
  );
}
