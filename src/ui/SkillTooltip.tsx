import type { ReactNode } from 'react';
import type { Skill } from '../model/types';
import { HoverCard } from './HoverCard';
import { SKILL_KIND_LABELS, T } from './strings.fr';

interface Props {
  skill: Skill;
  /** Level to highlight (current or requested). */
  level?: number;
  /** Second level to mark, e.g. the requested level in results. */
  target?: number;
  children: ReactNode;
  className?: string;
  placement?: 'below' | 'right';
  focusable?: boolean;
}

function SkillTooltipContent({ skill, level, target }: { skill: Skill; level?: number; target?: number }) {
  const setLike = skill.kind === 'set' || skill.kind === 'group';
  return (
    <>
      <div className="tt-head">
        <strong>{skill.name}</strong>
        <span className={`kind kind-${skill.kind}`}>{SKILL_KIND_LABELS[skill.kind]}</span>
      </div>
      {skill.description && <p className="tt-desc">{skill.description}</p>}
      <ul className="tt-ranks">
        {skill.ranks.map((r) => (
          <li key={r.level} className={r.level === level ? 'tt-current' : undefined}>
            <span className="tt-level">
              {T.level} {r.level}
              {r.level === target && target !== level ? ` · ${T.requested}` : ''}
            </span>
            {setLike && r.name && (
              <span className="tt-rank-name">
                {r.name} ({T.pieces(r.piecesRequired ?? 0)})
              </span>
            )}
            <span>{r.description}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Shows the skill's description and per-level effects on hover or focus. */
export function SkillTooltip({ skill, level, target, ...rest }: Props) {
  return <HoverCard {...rest} content={() => <SkillTooltipContent skill={skill} level={level} target={target} />} />;
}
