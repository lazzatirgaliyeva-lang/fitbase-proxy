const EMAILS = ['lazzat.irgaliyeva@gmail.com', 'ilmar.irgaliyev@gmail.com'];

async function fitbase(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://api.fitbase.io/api/${path}${qs ? '?' + qs : ''}`, {
    headers: {
      'domain': process.env.FITBASE_DOMAIN,
      'Authorization': `Bearer ${process.env.FITBASE_TOKEN}`
    }
  });
  return res.json();
}

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    if (req.method !== 'GET' || !req.url.includes('manual')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  try {
    const [clients, contracts, leads, users] = await Promise.all([
      fitbase('v2/client', { page: 1, page_size: 100 }),
      fitbase('v2/client-contract', { page: 1, page_size: 100 }),
      fitbase('v2/lead', { page: 1, page_size: 100 }),
      fitbase('v2/user', { page: 1, page_size: 100 })
    ]);

    const totalClients = clients.total_count || 0;
    const activeClients = (clients.items || []).filter(c => c.status === 1).length;
    const archivedClients = (clients.items || []).filter(c => c.is_archive).length;
    const churnPct = totalClients > 0 ? Math.round(archivedClients / totalClients * 100) : 0;
    const totalLeads = leads.total_count || 0;
    const newLeads = (leads.items || []).filter(l => {
      const created = l.created_at * 1000;
      const yesterday = Date.now() - 86400000;
      return created > yesterday;
    }).length;
    const totalContracts = contracts.total_count || 0;
    const paidContracts = (contracts.items || []).filter(c => c.payment).length;
    const payRate = contracts.items?.length > 0 ? Math.round(paidContracts / contracts.items.length * 100) : 0;
    const activeStaff = (users.items || []).filter(u => u.status === 10).length;

    const churnStatus = churnPct <= 8 ? '✅' : churnPct <= 12 ? '⚠️' : '🔴';
    const leadsStatus = newLeads >= 5 ? '✅' : newLeads >= 2 ? '⚠️' : '🔴';
    const payStatus = payRate >= 70 ? '✅' : payRate >= 50 ? '⚠️' : '🔴';

    const today = new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Asia/Almaty' });

    const html = `
<!DOCTYPE html>
<html lang="ru">
<head><meta charset="UTF-8"><style>
body{font-family:-apple-system,sans-serif;background:#f5f5f5;margin:0;padding:20px}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e5e5}
.header{background:#1d4ed8;color:#fff;padding:24px;text-align:center}
.header h1{font-size:20px;margin:0 0 4px}
.header p{font-size:13px;margin:0;opacity:.8}
.body{padding:24px}
.metric{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f0f0}
.metric:last-child{border-bottom:none}
.metric-label{font-size:13px;color:#666}
.metric-value{font-size:18px;font-weight:700;color:#111}
.metric-sub{font-size:11px;color:#999;margin-top:2px}
.section-title{font-size:11px;font-weight:600;color:#999;text-transform:uppercase;letter-spacing:.05em;margin:20px 0 8px}
.alert{padding:12px 14px;border-radius:8px;font-size:13px;margin-bottom:8px;line-height:1.5}
.alert-warn{background:#fef9c3;color:#854d0e}
.alert-ok{background:#f0fdf4;color:#166534}
.alert-err{background:#fee2e2;color:#991b1b}
.footer{background:#f9fafb;padding:16px;text-align:center;font-size:12px;color:#999;border-top:1px solid #e5e5e5}
</style></head>
<body>
<div class="wrap">
  <div class="header">
    <h1>🏋️ Bronx Fitness</h1>
    <p>Утренний брифинг · ${today}</p>
  </div>
  <div class="body">
    <div class="section-title">Топ-5 метрик</div>
    <div class="metric">
      <div><div class="metric-label">👥 Клиентов в базе</div><div class="metric-sub">активных из загруженных: ${activeClients}</div></div>
      <div class="metric-value">${totalClients.toLocaleString('ru')}</div>
    </div>
    <div class="metric">
      <div><div class="metric-label">${churnStatus} Отток (архивные)</div><div class="metric-sub">норма 5–8%, у вас ${churnPct}%</div></div>
      <div class="metric-value">${churnPct}%</div>
    </div>
    <div class="metric">
      <div><div class="metric-label">${leadsStatus} Новых заявок за сутки</div><div class="metric-sub">всего в CRM: ${totalLeads.toLocaleString('ru')}</div></div>
      <div class="metric-value">${newLeads}</div>
    </div>
    <div class="metric">
      <div><div class="metric-label">${payStatus} Оплата абонементов</div><div class="metric-sub">оплачено ${paidContracts} из ${contracts.items?.length || 0}</div></div>
      <div class="metric-value">${payRate}%</div>
    </div>
    <div class="metric">
      <div><div class="metric-label">💪 Активных сотрудников</div><div class="metric-sub">всего в системе: ${users.items?.length || 0}</div></div>
      <div class="metric-value">${activeStaff}</div>
    </div>

    <div class="section-title">Статус</div>
    ${churnPct > 12 ? `<div class="alert alert-err">🔴 Критический отток ${churnPct}% — выше нормы (5–8%). Немедленно проверьте причины и запустите реактивацию.</div>` : churnPct > 8 ? `<div class="alert alert-warn">⚠️ Отток ${churnPct}% — чуть выше нормы. Следите за динамикой.</div>` : `<div class="alert alert-ok">✅ Отток в норме — ${churnPct}%</div>`}
    ${newLeads < 2 ? `<div class="alert alert-err">🔴 Мало новых заявок вчера (${newLeads}). Проверьте рекламные каналы.</div>` : newLeads < 5 ? `<div class="alert alert-warn">⚠️ Заявок вчера: ${newLeads}. Можно активнее.</div>` : `<div class="alert alert-ok">✅ Хороший поток заявок — ${newLeads} вчера</div>`}
    ${payRate < 50 ? `<div class="alert alert-err">🔴 Низкая оплата абонементов — ${payRate}%. Проверьте дебиторку.</div>` : payRate < 70 ? `<div class="alert alert-warn">⚠️ Оплата ${payRate}% — есть неоплаченные абонементы.</div>` : `<div class="alert alert-ok">✅ Оплата абонементов в норме — ${payRate}%</div>`}
  </div>
  <div class="footer">Fitness CEO Advisor · Bronx Fitness · Астана<br>Данные из Fitbase CRM · Отправлено автоматически в 9:00</div>
</div>
</body></html>`;

    for (const email of EMAILS) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Fitness CEO Advisor <onboarding@resend.dev>',
          to: email,
          subject: `🏋️ Bronx Fitness — брифинг ${new Date().toLocaleDateString('ru-RU')}`,
          html
        })
      });
    }

    res.status(200).json({ success: true, sent: EMAILS.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
