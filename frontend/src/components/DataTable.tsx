import { useMemo, useState } from 'react';

import type { TableColumn } from '../types';
import { EmptyState } from './StatusViews';

const PAGE_SIZE_OPTIONS = [10, 20, 50];

export function DataTable<T extends object>({
  columns,
  rows,
  emptyText = '暂无数据',
  emptyDescription,
  tableClassName,
}: {
  columns: TableColumn<T>[];
  rows: T[];
  emptyText?: string;
  emptyDescription?: string;
  tableClassName?: string;
}) {
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const effectivePage = Math.min(Math.max(currentPage, 1), totalPages);
  const pageRows = useMemo(() => {
    const start = (effectivePage - 1) * pageSize;

    return rows.slice(start, start + pageSize);
  }, [effectivePage, pageSize, rows]);

  const changePageSize = (value: string) => {
    const nextPageSize = Number.parseInt(value, 10);

    if (PAGE_SIZE_OPTIONS.includes(nextPageSize)) {
      setPageSize(nextPageSize);
      setCurrentPage((page) => Math.min(page, Math.max(1, Math.ceil(rows.length / nextPageSize))));
    }
  };

  return (
    <div className="table-card">
      <table className={tableClassName ? `data-table ${tableClassName}` : 'data-table'}>
        <colgroup>
          {columns.map((column) => (
            <col key={String(column.key)} style={{ width: column.width }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={String(column.key) === 'batchSelect' ? 'batch-select-column' : undefined} key={String(column.key)}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((row, index) => (
            <tr key={String((row as Record<string, unknown>).id ?? index)}>
              {columns.map((column) => {
                const columnKey = String(column.key);
                const value = (row as Record<string, unknown>)[String(column.key)];
                return (
                  <td className={columnKey === 'batchSelect' ? 'batch-select-column' : undefined} key={columnKey}>
                    {column.render ? column.render(row) : String(value ?? '-')}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? <EmptyState compact description={emptyDescription} title={emptyText} /> : null}
      <div className="table-footer">
        <span>共 {rows.length || 0} 条记录</span>
        <div className="pagination">
          <select aria-label="每页条数" onChange={(event) => changePageSize(event.currentTarget.value)} value={pageSize}>
            {PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option} 条/页</option>)}
          </select>
          {rows.length > pageSize ? (
            <>
              <button disabled={effectivePage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button">‹</button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button className={page === effectivePage ? 'active' : undefined} key={page} onClick={() => setCurrentPage(page)} type="button">
                  {page}
                </button>
              ))}
              <button disabled={effectivePage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} type="button">›</button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
