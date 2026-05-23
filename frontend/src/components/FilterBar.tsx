import { useState } from 'react';

import { ButtonRow } from './Button';

export type FilterValues = Record<string, string>;

export function FilterBar({ fields, onSearch }: { fields: string[]; onSearch?: (filters: FilterValues) => void }) {
  const [draftFilters, setDraftFilters] = useState<FilterValues>({});
  const canSearch = Boolean(onSearch);

  const updateDraftFilter = (field: string, value: string) => {
    setDraftFilters((current) => ({ ...current, [field]: value }));
  };

  const submitSearch = () => {
    onSearch?.(draftFilters);
  };

  const resetSearch = () => {
    const emptyFilters = Object.fromEntries(fields.map((field) => [field, '']));

    setDraftFilters(emptyFilters);
    onSearch?.(emptyFilters);
  };

  return (
    <form className="filter-panel" onSubmit={(event) => {
      event.preventDefault();
      submitSearch();
    }}>
      <div className="filter-title">
        <strong>筛选条件</strong>
        <span>按业务字段快速定位记录</span>
      </div>
      <div className="filter-grid">
        {fields.map((field, index) => (
          <label className="field" key={field}>
            <span>{field}</span>
            <input
              onChange={(event) => updateDraftFilter(field, event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  submitSearch();
                }
              }}
              placeholder={index === 0 ? '请输入关键词' : `请选择${field}`}
              value={draftFilters[field] ?? ''}
            />
          </label>
        ))}
      </div>
      {canSearch ? (
        <ButtonRow
          actions={[
            { label: '重置', tone: 'secondary', onClick: resetSearch },
            { label: '查询', tone: 'primary', onClick: submitSearch },
          ]}
        />
      ) : null}
    </form>
  );
}
