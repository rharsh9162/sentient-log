export function getAlertEmailHtml(data) {
  const { ruleName, domain, metricLabel, formattedMeasured, formattedThreshold, overPct, overDelta, timeStr, frequency } = data;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F0F4F8;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#7C3AED,#1D4ED8);padding:28px 32px">
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <div style="width:32px;height:32px;border-radius:8px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center">
        <span style="font-size:16px;color:#fff;font-weight:bold;">!</span>
      </div>
      <span style="font-size:14px;font-weight:500;color:rgba(255,255,255,0.9);letter-spacing:.02em">SentientLog</span>
    </div>
    <div style="font-size:22px;font-weight:600;color:#ffffff;margin-bottom:6px">Alert Fired</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.75)">A threshold you set has been crossed</div>
  </div>

  <!-- Content -->
  <div style="padding:28px 32px">
    <div style="display:inline-flex;align-items:center;gap:5px;background:rgba(239,68,68,0.08);color:#991B1B;font-size:12px;font-weight:500;padding:4px 12px;border-radius:20px;margin-bottom:8px">
      [ALERT] ${ruleName}
    </div>
    <div style="font-size:12px;color:#64748B;margin-bottom:16px">fired at ${timeStr}</div>

    <p style="font-size:14px;color:#475569;line-height:1.6;margin:0 0 20px">
      Your alert rule <strong style="color:#1E293B">${ruleName}</strong> just fired.
      The ${metricLabel.toLowerCase()} on <strong style="color:#1E293B">${domain}</strong> exceeded
      your threshold of <strong style="color:#1E293B">${formattedThreshold}</strong>.
    </p>

    <!-- Stats Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:20px 0">
      <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;color:#64748B;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Measured value</div>
        <div style="font-size:20px;font-weight:600;color:#EF4444">${formattedMeasured}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">${metricLabel.toLowerCase()}</div>
      </div>
      <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;color:#64748B;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Your threshold</div>
        <div style="font-size:20px;font-weight:600;color:#1E293B">${formattedThreshold}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">alert trigger point</div>
      </div>
      <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;color:#64748B;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Domain</div>
        <div style="font-size:15px;font-weight:500;color:#1E293B;margin-top:4px">${domain}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">monitored site</div>
      </div>
      <div style="background:#F8FAFC;border-radius:10px;padding:14px 16px">
        <div style="font-size:11px;color:#64748B;font-weight:500;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">Over threshold by</div>
        <div style="font-size:20px;font-weight:600;color:#EF4444">${overPct}</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px">${overDelta}</div>
      </div>
    </div>

    <div style="height:1px;background:#E2E8F0;margin:20px 0"></div>

    <div style="margin-bottom:24px">
      <a href="#" style="display:inline-block;background:linear-gradient(135deg,#2563EB,#3B82F6);color:#ffffff;font-size:14px;font-weight:500;padding:12px 24px;border-radius:10px;text-decoration:none">View in SentientLog</a>
    </div>

    <div style="background:#F8FAFC;border-radius:10px;padding:12px 16px;font-size:12px;color:#64748B;line-height:1.6">
      <p style="margin: 0;">This rule is evaluated <strong>${frequency}</strong>.</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:16px 32px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:12px;color:#94A3B8;text-align:center">
    SentientLog · alerts@sentientlog.app
  </div>

</div>
</body>
</html>`;
}
