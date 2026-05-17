import type { StatusTone } from '../types';

const toneMap: Record<string, StatusTone> = {
  草稿: 'gray',
  待发布复核: 'orange',
  发布驳回: 'red',
  公示中: 'blue',
  竞拍中: 'orange',
  已结束: 'gray',
  成交公示中: 'blue',
  待签约: 'orange',
  已签约: 'blue',
  已完成: 'green',
  违约: 'red',
  已取消: 'gray',
  未提交: 'gray',
  待审核: 'orange',
  审核通过: 'green',
  审核驳回: 'red',
  已生成: 'orange',
  已公示: 'green',
  未退款: 'orange',
  审核中: 'blue',
  已退款: 'green',
  已发布: 'green',
  已下架: 'gray',
  发送成功: 'green',
  发送失败: 'red',
  已拉黑: 'red',
};

export function StatusTag({ value, tone }: { value: string; tone?: StatusTone }) {
  return <span className={`status-tag ${tone ?? toneMap[value] ?? 'gray'}`}>{value}</span>;
}
