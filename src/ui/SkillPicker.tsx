import { useMemo, useState } from 'react';
import type { Db } from '../model/db';
import type { Skill, SkillLevel } from '../model/types';
import { SKILL_KIND_LABELS, T } from './strings.fr';
import { compareFr, normalize } from './format';
import { SkillTooltip } from './SkillTooltip';
import { Panel } from './Panel';

interface Props {
  db: Db;
  selected: SkillLevel[];
  onChange: (skills: SkillLevel[]) => void;
}

const MAX_SUGGESTIONS = 40;

const isSetLike = (s: Skill) => s.kind === 'set' || s.kind === 'group';

function levelLabel(skill: Skill, level: number): string {
  const rank = skill.ranks.find((r) => r.level === level);
  if (isSetLike(skill) && rank) {
    return `${rank.name ?? `${T.level} ${level}`} (${T.pieces(rank.piecesRequired ?? 0)})`;
  }
  return `${T.level} ${level}`;
}

export function SkillPicker({ db, selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const allSkills = useMemo(() => [...db.data.skills].sort((a, b) => compareFr(a.name, b.name)), [db]);

  const suggestions = useMemo(() => {
    const chosen = new Set(selected.map((s) => s.id));
    const q = normalize(query.trim());
    const available = allSkills.filter((s) => !chosen.has(s.id));
    if (!q) return available.slice(0, MAX_SUGGESTIONS);
    // Names starting with the query first, then other name matches,
    // then matches in descriptions / set rank names (e.g. "affinité").
    const startsWith = (s: Skill) => normalize(s.name).startsWith(q);
    const byName = available
      .filter((s) => normalize(s.name).includes(q))
      .sort((a, b) => Number(startsWith(b)) - Number(startsWith(a)));
    const byText = available.filter(
      (s) =>
        !byName.includes(s) &&
        normalize([s.description ?? '', ...s.ranks.map((r) => `${r.name ?? ''} ${r.description}`)].join(' ')).includes(q),
    );
    return [...byName, ...byText].slice(0, MAX_SUGGESTIONS);
  }, [allSkills, selected, query]);

  const add = (skill: Skill) => {
    onChange([...selected, { id: skill.id, level: isSetLike(skill) ? 1 : skill.maxLevel }]);
    setQuery('');
  };

  return (
    <Panel title={T.skillsSection}>
      <div className="combo">
        <span className="search-icon" aria-hidden="true">
          ⌕
        </span>
        <input
          type="search"
          placeholder={T.skillSearch}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && suggestions[0]) add(suggestions[0]);
            if (e.key === 'Escape') setOpen(false);
          }}
        />
        {open && (
          <ul className="suggestions" role="listbox">
            {suggestions.length === 0 && <li className="muted">{T.noSkillFound}</li>}
            {suggestions.map((s, i) => (
              <li
                key={s.id}
                role="option"
                aria-selected={i === 0}
                className={i === 0 ? 'is-active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(s)}
              >
                <SkillTooltip skill={s} placement="right" focusable={false} className="tt-row">
                  <span>{s.name}</span>
                  <span className={`kind kind-${s.kind}`}>{SKILL_KIND_LABELS[s.kind]}</span>
                </SkillTooltip>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected.length === 0 ? (
        <p className="muted hint">{T.noSkillSelected}</p>
      ) : (
        <ul className="selected-skills">
          {selected.map((sel) => {
            const skill = db.skill(sel.id);
            if (!skill) return null;
            return (
              <li key={sel.id}>
                <SkillTooltip skill={skill} level={sel.level} className="skill-name">
                  <span>{skill.name}</span>
                  <span className={`kind kind-${skill.kind}`}>{SKILL_KIND_LABELS[skill.kind]}</span>
                </SkillTooltip>
                <select
                  value={sel.level}
                  onChange={(e) =>
                    onChange(selected.map((s) => (s.id === sel.id ? { ...s, level: +e.target.value } : s)))
                  }
                >
                  {skill.ranks.map((r) => (
                    <option key={r.level} value={r.level} title={r.description}>
                      {levelLabel(skill, r.level)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="square-btn"
                  aria-label={T.remove}
                  title={T.remove}
                  onClick={() => onChange(selected.filter((s) => s.id !== sel.id))}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
