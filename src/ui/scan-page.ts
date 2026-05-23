export function renderScanPage(): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>PDA Report</title>
  <style>
    :root { --bg:#f6f7f9; --panel:#fff; --text:#111827; --muted:#6b7280; --line:#d1d5db; --primary:#111827; --danger:#b91c1c; --ok:#166534; }
    * { box-sizing:border-box; }
    body { margin:0; background:var(--bg); color:var(--text); font-family:Arial, "Microsoft YaHei", sans-serif; }
    main { max-width:440px; margin:0 auto; padding:14px; }
    h1 { font-size:22px; margin:8px 0 14px; letter-spacing:0; }
    .panel { background:var(--panel); border:1px solid var(--line); border-radius:8px; padding:12px; margin:10px 0; }
    label { display:block; font-size:12px; color:var(--muted); margin-bottom:5px; }
    input, button { width:100%; font:inherit; border-radius:8px; }
    input { border:1px solid var(--line); background:#fff; padding:13px 12px; min-height:48px; }
    button { border:0; background:var(--primary); color:#fff; padding:13px 12px; min-height:50px; font-weight:700; }
    .grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:8px; }
    .grid.four { grid-template-columns:repeat(4, 1fr); }
    .row { margin:10px 0; }
    .meta { display:grid; grid-template-columns:96px minmax(0, 1fr); gap:8px; font-size:14px; padding:6px 0; border-bottom:1px dashed #e5e7eb; }
    .meta span:first-child { color:var(--muted); }
    .msg { display:none; padding:10px; border-radius:8px; margin:10px 0; font-size:14px; }
    .msg.ok { display:block; background:#dcfce7; color:var(--ok); }
    .msg.err { display:block; background:#fee2e2; color:var(--danger); }
  </style>
</head>
<body>
  <main>
    <h1>PDA Production Report</h1>
    <div id="message" class="msg"></div>
    <section class="panel">
      <div class="row">
        <label for="scan">Scan input</label>
        <input id="scan" autocomplete="off" autofocus placeholder="WO-20260516-001" />
      </div>
      <button id="scanBtn">Load</button>
    </section>
    <section id="woPanel" class="panel" style="display:none">
      <div id="woMeta"></div>
      <div class="grid four">
        <div><label for="report">Total</label><input id="report" type="number" min="0" step="1" value="0" /></div>
        <div><label for="good">Good</label><input id="good" type="number" min="0" step="1" value="0" /></div>
        <div><label for="defect">Defect</label><input id="defect" type="number" min="0" step="1" value="0" /></div>
        <div><label for="scrap">Scrap</label><input id="scrap" type="number" min="0" step="1" value="0" /></div>
      </div>
      <div class="row">
        <button id="submitBtn">Submit</button>
      </div>
    </section>
  </main>
<script>
const qs = new URLSearchParams(location.search);
const token = qs.get('token') || localStorage.getItem('APP_TOKEN') || '';
if (qs.get('token')) localStorage.setItem('APP_TOKEN', qs.get('token'));
let current = null;

function show(message, type) {
  const el = document.getElementById('message');
  el.className = 'msg ' + type;
  el.textContent = message;
}

async function api(path, options = {}) {
  const res = await fetch('/api' + path, {
    ...options,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'x-app-token': token,
      'x-app-role': 'operator',
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.ok === false) throw new Error(json.error || 'request failed');
  return json.data;
}

function esc(value) {
  return String(value || '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
}

function renderWorkOrder(wo) {
  current = wo;
  document.getElementById('woPanel').style.display = 'block';
  document.getElementById('woMeta').innerHTML = [
    ['Code', wo.code],
    ['Product', (wo.product?.code || '') + ' ' + (wo.product?.name || '')],
    ['Status', wo.status],
    ['Progress', (wo.reported_quantity ?? (wo.completed_quantity + wo.defect_quantity + wo.scrap_quantity)) + ' / ' + wo.planned_quantity],
    ['Good / Defect / Scrap', (wo.good_quantity ?? wo.completed_quantity) + ' / ' + wo.defect_quantity + ' / ' + wo.scrap_quantity]
  ].map(([k, v]) => '<div class="meta"><span>' + esc(k) + '</span><strong>' + esc(v) + '</strong></div>').join('');
}

document.getElementById('scanBtn').addEventListener('click', async () => {
  try {
    const code = document.getElementById('scan').value.trim();
    if (!code) return show('Scan or input work order code.', 'err');
    renderWorkOrder(await api('/scan/work-order', { method:'POST', body: JSON.stringify({ code }) }));
    show('Loaded.', 'ok');
  } catch (e) {
    show(e instanceof Error ? e.message : 'scan failed', 'err');
  }
});

document.getElementById('scan').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') document.getElementById('scanBtn').click();
});

document.getElementById('submitBtn').addEventListener('click', async () => {
  try {
    if (!current) return show('Load a work order first.', 'err');
    const reportQty = Number(document.getElementById('report').value || 0);
    const goodQty = Number(document.getElementById('good').value || 0);
    const defectQty = Number(document.getElementById('defect').value || 0);
    const scrapQty = Number(document.getElementById('scrap').value || 0);
    if (goodQty + defectQty + scrapQty > reportQty) return show('Good + defect + scrap cannot exceed total.', 'err');
    const result = await api('/reports/pda', {
      method:'POST',
      body: JSON.stringify({
        work_order_id: current.id,
        report_qty: reportQty,
        good_qty: goodQty,
        defect_qty: defectQty,
        scrap_qty: scrapQty
      })
    });
    renderWorkOrder(result.work_order);
    document.getElementById('report').value = '0';
    document.getElementById('good').value = '0';
    document.getElementById('defect').value = '0';
    document.getElementById('scrap').value = '0';
    show('Submitted.', 'ok');
  } catch (e) {
    show(e instanceof Error ? e.message : 'submit failed', 'err');
  }
});
</script>
</body>
</html>`;
}
