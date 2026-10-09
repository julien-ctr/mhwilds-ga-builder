import type { Db } from '../model/db';
import { inRarityRange, MAX_RARITY, type BuildRequest, type GaParams, type ObjectiveWeights } from '../engine/request';
import { OBJECTIVE_LEVELS, T } from './strings.fr';
import { rarityColor } from './format';
import { Panel } from './Panel';

interface Props {
  db: Db;
  request: BuildRequest;
  onChange: (patch: Partial<BuildRequest>) => void;
}

const OBJECTIVES: { key: keyof ObjectiveWeights; label: string }[] = [
  { key: 'defense', label: T.objDefense },
  { key: 'freeSlots', label: T.objFreeSlots },
  { key: 'bonusSkills', label: T.objBonusSkills },
  { key: 'weaponAttack', label: T.objWeaponAttack },
];

const GA_FIELDS: { key: keyof GaParams; label: string; min: number; max: number }[] = [
  { key: 'populationSize', label: T.population, min: 20, max: 2000 },
  { key: 'generations', label: T.generations, min: 10, max: 5000 },
  { key: 'stallGenerations', label: T.stall, min: 5, max: 5000 },
  { key: 'resultCount', label: T.resultCount, min: 1, max: 50 },
  { key: 'seed', label: T.seed, min: 0, max: 2 ** 31 - 1 },
];

const RARITIES = Array.from({ length: MAX_RARITY }, (_, i) => i + 1);

function RaritySelect({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      <select
        className="rarity-select"
        style={{ color: rarityColor(value) }}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      >
        {RARITIES.map((r) => (
          <option key={r} value={r}>
            ★{r}
          </option>
        ))}
      </select>
    </label>
  );
}

export function OptionsPanel({ db, request, onChange }: Props) {
  // Moving one bound past the other drags it along, so the range never becomes empty.
  const setMin = (minRarity: number) => onChange({ minRarity, maxRarity: Math.max(minRarity, request.maxRarity) });
  const setMax = (maxRarity: number) => onChange({ maxRarity, minRarity: Math.min(maxRarity, request.minRarity) });
  const armorAvailable = db.data.armor.some(
    (a) => (request.rank === 'all' || a.rank === 'high') && inRarityRange(a, request),
  );

  return (
    <Panel title={T.optionsSection}>
      <label className="field">
        <span className="label">{T.rank}</span>
        <select value={request.rank} onChange={(e) => onChange({ rank: e.target.value as BuildRequest['rank'] })}>
          <option value="high">{T.rankHigh}</option>
          <option value="all">{T.rankAll}</option>
        </select>
      </label>
      <div className="row">
        <RaritySelect label={T.minRarity} value={request.minRarity} onChange={setMin} />
        <RaritySelect label={T.maxRarity} value={request.maxRarity} onChange={setMax} />
      </div>
      {!armorAvailable && <span className="warn">{T.noArmorInRange}</span>}

      <div className="objectives">
        <span className="label">{T.objectives}</span>
        {OBJECTIVES.map(({ key, label }) => (
          <label key={key} className="field inline">
            <span className="label">{label}</span>
            <select
              className={request.objectives[key] === 0 ? 'is-off' : undefined}
              value={request.objectives[key]}
              onChange={(e) => onChange({ objectives: { ...request.objectives, [key]: +e.target.value } })}
            >
              {OBJECTIVE_LEVELS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <details>
        <summary>{T.advanced}</summary>
        <div className="objectives">
          {GA_FIELDS.map(({ key, label, min, max }) => (
            <label key={key} className="field inline">
              <span className="label">{label}</span>
              <input
                type="number"
                min={min}
                max={max}
                value={request.ga[key]}
                onChange={(e) => {
                  const v = Math.round(Number(e.target.value));
                  if (Number.isFinite(v)) onChange({ ga: { ...request.ga, [key]: Math.min(max, Math.max(min, v)) } });
                }}
              />
            </label>
          ))}
        </div>
      </details>
    </Panel>
  );
}
