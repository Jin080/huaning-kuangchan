import type { TableColumn } from '../types';
import { EmptyState } from './StatusViews';

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
          {rows.map((row, index) => (
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
          <select aria-label="每页条数" defaultValue="10">
            <option value="10">10 条/页</option>
            <option value="20">20 条/页</option>
            <option value="50">50 条/页</option>
          </select>
          <button type="button">‹</button>
          <button className="active" type="button">
            1
          </button>
          <button type="button">2</button>
          <button type="button">3</button>
          <span>...</span>
          <button type="button">›</button>
        </div>
      </div>
    </div>
  );
}
