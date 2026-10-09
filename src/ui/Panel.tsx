import type { ReactNode } from 'react';

interface Props {
  title: string;
  /** Extra content in the header row (count badge, actions…). */
  extra?: ReactNode;
  children: ReactNode;
}

/** Square form panel with the ember-diamond uppercase heading. */
export function Panel({ title, extra, children }: Props) {
  return (
    <section className="panel">
      <header className="panel-head">
        <span className="diamond" aria-hidden="true" />
        <h2>{title}</h2>
        {extra}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}
