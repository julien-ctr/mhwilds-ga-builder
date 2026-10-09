export function toggle<T>(list: T[] | undefined, value: T): T[] {
  const l = list ?? [];
  return l.includes(value) ? l.filter((v) => v !== value) : [...l, value];
}

/**
 * Toggleable chips backed by checkboxes. With `counts`, each chip shows how many items it would
 * match, and chips matching nothing are disabled (unless already selected).
 */
export function CheckboxGroup<V extends string>({
  values,
  labels,
  selected,
  onToggle,
  counts,
}: {
  values: V[];
  labels: Record<string, string>;
  selected: V[] | undefined;
  onToggle: (v: V) => void;
  counts?: Record<string, number>;
}) {
  return (
    <div className="chips">
      {values.map((v) => {
        const on = !!selected?.includes(v);
        const count = counts?.[v];
        const disabled = !on && count === 0;
        return (
          <label key={v} className={`chip ${on ? 'chip-on' : ''} ${disabled ? 'chip-disabled' : ''}`}>
            <input type="checkbox" checked={on} disabled={disabled} onChange={() => onToggle(v)} />
            {labels[v] ?? v}
            {count !== undefined && <span className="chip-count">{count}</span>}
          </label>
        );
      })}
    </div>
  );
}
