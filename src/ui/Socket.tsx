/**
 * Decoration slot marker, drawn as a gem socket: size 1 is a hollow ring, size 2 a tinted
 * gem and size 3 a full gem. The digit keeps the size readable without relying on colour.
 */
export function Socket({ size }: { size: number }) {
  return (
    <span className={`socket socket-${size}`} aria-label={`Emplacement ${size}`}>
      <span className="socket-outer" />
      <span className="socket-inner" />
      <span className="socket-digit">{size}</span>
    </span>
  );
}
