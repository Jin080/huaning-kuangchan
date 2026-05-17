import { ButtonRow } from './Button';

export function FilterBar({ fields }: { fields: string[] }) {
  return (
    <section className="filter-panel">
      <div className="filter-grid">
        {fields.map((field, index) => (
          <label className="field" key={field}>
            <span>{field}</span>
            <input placeholder={index === 0 ? '请输入关键词' : `请选择${field}`} />
          </label>
        ))}
      </div>
      <ButtonRow
        actions={[
          { label: '重置', tone: 'secondary' },
          { label: '查询', tone: 'primary' },
        ]}
      />
    </section>
  );
}
