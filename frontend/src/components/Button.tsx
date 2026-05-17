import type { Action } from '../types';

export function Button({ action }: { action: Action }) {
  return (
    <button className={`btn ${action.tone ?? 'secondary'}`} disabled={action.disabled} type="button">
      {action.label}
    </button>
  );
}

export function ButtonRow({ actions }: { actions: Action[] }) {
  return (
    <div className="button-row">
      {actions.map((action) => (
        <Button action={action} key={action.label} />
      ))}
    </div>
  );
}
