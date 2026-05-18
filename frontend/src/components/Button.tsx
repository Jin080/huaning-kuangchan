import type { Action } from '../types';
import { navigateTo } from '../navigation';

export function Button({ action }: { action: Action }) {
  const handleClick = () => {
    if (action.to) {
      navigateTo(action.to);
      return;
    }

    action.onClick?.();
  };

  return (
    <button className={`btn ${action.tone ?? 'secondary'}`} disabled={action.disabled} onClick={handleClick} type="button">
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
