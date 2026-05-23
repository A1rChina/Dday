import type { WorkOrderWithDetails } from '../types';

export function renderPrintWorkOrderPage(workOrder: WorkOrderWithDetails): string {
  const payload = workOrder.code;
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Work Order ${escapeHtml(workOrder.code)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, "Microsoft YaHei", sans-serif; color: #111827; background: #f4f4f5; }
    .sheet { width: 210mm; min-height: 297mm; margin: 0 auto; background: #fff; padding: 16mm; }
    .top { display: flex; justify-content: space-between; gap: 16px; border-bottom: 2px solid #111827; padding-bottom: 12px; }
    h1 { margin: 0 0 6px; font-size: 28px; letter-spacing: 0; }
    .muted { color: #52525b; font-size: 12px; }
    .code { font-size: 18px; font-weight: 700; }
    .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; margin-top: 18px; }
    .field { border-bottom: 1px solid #d4d4d8; padding: 8px 0; min-height: 42px; }
    .label { color: #71717a; font-size: 12px; margin-bottom: 3px; }
    .value { font-size: 15px; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin-top: 22px; }
    th, td { border: 1px solid #d4d4d8; padding: 8px; font-size: 13px; text-align: left; }
    th { background: #f4f4f5; }
    .barcode { margin-top: 10px; text-align: center; }
    .barcode svg { max-width: 78mm; width: 100%; height: auto; }
    .note { margin-top: 22px; border: 1px solid #d4d4d8; min-height: 38mm; padding: 10px; }
    .sign { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 28px; }
    .sign div { border-top: 1px solid #111827; padding-top: 6px; font-size: 12px; color: #52525b; }
    @media print {
      body { background: #fff; }
      .sheet { margin: 0; box-shadow: none; width: auto; min-height: auto; }
      .noprint { display: none; }
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top">
      <div>
        <h1>Production Work Order</h1>
        <div class="code">${escapeHtml(workOrder.code)}</div>
        <div class="muted">Scan payload: WO:${escapeHtml(payload)}</div>
      </div>
      <div class="barcode">
        ${renderCode39(payload)}
        <div class="muted">${escapeHtml(payload)}</div>
      </div>
    </div>

    <div class="grid">
      ${field('Customer', workOrder.customer_name)}
      ${field('Project', workOrder.project_name)}
      ${field('Product code', workOrder.product?.code ?? '')}
      ${field('Product name', workOrder.product?.name ?? '')}
      ${field('Material code', workOrder.material?.code ?? '')}
      ${field('Material name', workOrder.material?.name ?? '')}
      ${field('Planned quantity', `${workOrder.planned_quantity} ${workOrder.product?.unit ?? ''}`)}
      ${field('Status', workOrder.status)}
      ${field('Start date', workOrder.planned_start_date)}
      ${field('Finish date', workOrder.planned_finish_date)}
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:70px">Seq</th>
          <th>Process</th>
          <th style="width:110px">Plan qty</th>
          <th style="width:110px">Good</th>
          <th style="width:110px">Defect</th>
          <th style="width:110px">Scrap</th>
          <th style="width:110px">Status</th>
        </tr>
      </thead>
      <tbody>
        ${workOrder.steps.map((step) => `
          <tr>
            <td>${step.step_order}</td>
            <td>${escapeHtml(step.name)}</td>
            <td>${step.planned_quantity}</td>
            <td>${step.completed_quantity}</td>
            <td>${step.defect_quantity}</td>
            <td>${step.scrap_quantity}</td>
            <td>${escapeHtml(step.status)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="note">
      <div class="label">Notes</div>
      <div class="value">${escapeHtml(workOrder.notes)}</div>
    </div>

    <div class="sign">
      <div>Planner</div>
      <div>Production</div>
      <div>Quality</div>
      <div>Warehouse</div>
    </div>
  </div>
  <script>
    window.addEventListener('load', () => {
      const auto = new URLSearchParams(location.search).get('auto');
      if (auto !== '0') window.print();
    });
  </script>
</body>
</html>`;
}

function field(label: string, value: string | number): string {
  return `<div class="field"><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(String(value || ''))}</div></div>`;
}

function escapeHtml(value: string): string {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}

function renderCode39(value: string): string {
  const content = `*${value.toUpperCase().replace(/[^0-9A-Z .$/+%-]/g, '-')}*`;
  const patterns: Record<string, string> = {
    '0': 'nnnwwnwnn', '1': 'wnnwnnnnw', '2': 'nnwwnnnnw', '3': 'wnwwnnnnn',
    '4': 'nnnwwnnnw', '5': 'wnnwwnnnn', '6': 'nnwwwnnnn', '7': 'nnnwnnwnw',
    '8': 'wnnwnnwnn', '9': 'nnwwnnwnn', A: 'wnnnnwnnw', B: 'nnwnnwnnw',
    C: 'wnwnnwnnn', D: 'nnnnwwnnw', E: 'wnnnwwnnn', F: 'nnwnwwnnn',
    G: 'nnnnnwwnw', H: 'wnnnnwwnn', I: 'nnwnnwwnn', J: 'nnnnwwwnn',
    K: 'wnnnnnnww', L: 'nnwnnnnww', M: 'wnwnnnnwn', N: 'nnnnwnnww',
    O: 'wnnnwnnwn', P: 'nnwnwnnwn', Q: 'nnnnnnwww', R: 'wnnnnnwwn',
    S: 'nnwnnnwwn', T: 'nnnnwnwwn', U: 'wwnnnnnnw', V: 'nwwnnnnnw',
    W: 'wwwnnnnnn', X: 'nwnnwnnnw', Y: 'wwnnwnnnn', Z: 'nwwnwnnnn',
    '-': 'nwnnnnwnw', '.': 'wwnnnnwnn', ' ': 'nwwnnnwnn', '$': 'nwnwnwnnn',
    '/': 'nwnwnnnwn', '+': 'nwnnnwnwn', '%': 'nnnwnwnwn', '*': 'nwnnwnwnn',
  };
  const narrow = 2;
  const wide = 5;
  const height = 74;
  let x = 0;
  const bars: string[] = [];
  for (const char of content) {
    const pattern = patterns[char] ?? patterns['-'];
    [...pattern].forEach((part, index) => {
      const width = part === 'w' ? wide : narrow;
      if (index % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${width}" height="${height}" fill="#111827" />`);
      x += width;
    });
    x += narrow;
  }
  return `<svg role="img" aria-label="barcode" viewBox="0 0 ${x} ${height}" xmlns="http://www.w3.org/2000/svg">${bars.join('')}</svg>`;
}
