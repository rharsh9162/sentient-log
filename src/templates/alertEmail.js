export function getAlertEmailHtml(data) {
  const { ruleName, domain, metricLabel, formattedMeasured, formattedThreshold, diffPct, diffDelta, timeStr, frequency, condition } = data;

  const directionText = condition === "gt" ? "exceeded" : "fell below";
  const alertColor = condition === "gt" ? "#EF4444" : "#F59E0B";
  const alertBg = condition === "gt" ? "rgba(239,68,68,0.1)" : "rgba(245,158,11,0.1)";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif">
<div style="max-width:600px;margin:32px auto;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.05);border:1px solid rgba(226,232,240,0.8)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#6366F1,#3B82F6);padding:36px 40px">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
      <div style="width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.2);display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
        <span style="font-size:18px;color:#fff;font-weight:bold;">!</span>
      </div>
      <span style="font-size:16px;font-weight:600;color:rgba(255,255,255,0.95);letter-spacing:.02em">SentientLog</span>
    </div>
    <div style="font-size:26px;font-weight:700;color:#ffffff;margin-bottom:8px;letter-spacing:-0.02em">Alert Triggered</div>
    <div style="font-size:15px;color:rgba(255,255,255,0.85);font-weight:400">A metric threshold you configured has been crossed.</div>
  </div>

  <!-- Content -->
  <div style="padding:40px">
    <div style="display:inline-flex;align-items:center;gap:6px;background:${alertBg};color:${alertColor};font-size:13px;font-weight:600;padding:6px 14px;border-radius:24px;margin-bottom:12px;letter-spacing:0.02em">
      [ALERT] ${ruleName}
    </div>
    <div style="font-size:13px;color:#64748B;margin-bottom:20px;font-weight:500">Fired at ${timeStr}</div>

    <p style="font-size:15px;color:#334155;line-height:1.7;margin:0 0 28px;font-weight:400">
      Your alert rule <strong style="color:#0F172A;font-weight:600">${ruleName}</strong> just fired.
      The ${metricLabel.toLowerCase()} on <strong style="color:#0F172A;font-weight:600">${domain}</strong> <strong style="color:${alertColor};font-weight:600">${directionText}</strong>
      your threshold of <strong style="color:#0F172A;font-weight:600">${formattedThreshold}</strong>.
    </p>

    <!-- Stats Grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:28px 0">
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px">
        <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Measured value</div>
        <div style="font-size:24px;font-weight:700;color:${alertColor}">${formattedMeasured}</div>
        <div style="font-size:13px;color:#94A3B8;margin-top:4px;font-weight:500">${metricLabel.toLowerCase()}</div>
      </div>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px">
        <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Your threshold</div>
        <div style="font-size:24px;font-weight:700;color:#0F172A">${formattedThreshold}</div>
        <div style="font-size:13px;color:#94A3B8;margin-top:4px;font-weight:500">alert trigger point</div>
      </div>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px">
        <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Domain</div>
        <div style="font-size:16px;font-weight:600;color:#0F172A;margin-top:6px">${domain}</div>
        <div style="font-size:13px;color:#94A3B8;margin-top:4px;font-weight:500">monitored site</div>
      </div>
      <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:20px">
        <div style="font-size:12px;color:#64748B;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Difference</div>
        <div style="font-size:24px;font-weight:700;color:${alertColor}">${diffPct}</div>
        <div style="font-size:13px;color:#94A3B8;margin-top:4px;font-weight:500">${diffDelta}</div>
      </div>
    </div>

    <div style="height:1px;background:#E2E8F0;margin:32px 0"></div>

    <div style="margin-bottom:32px">
      <a href="#" style="display:inline-block;background:linear-gradient(135deg,#3B82F6,#2563EB);color:#ffffff;font-size:15px;font-weight:600;padding:14px 28px;border-radius:12px;text-decoration:none;box-shadow:0 4px 12px rgba(37,99,235,0.25)">View in SentientLog</a>
    </div>

    <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:12px;padding:16px 20px;font-size:13px;color:#475569;line-height:1.6">
      <p style="margin: 0;font-weight:500">This rule is evaluated <strong>${frequency}</strong>.</p>
    </div>
  </div>

  <!-- Footer -->
  <div style="padding:24px 40px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:13px;color:#64748B;text-align:center;font-weight:500">
    SentientLog · alerts@sentientlog.app
  </div>

</div>
</body>
</html>`;
}
