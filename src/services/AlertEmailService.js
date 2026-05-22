import { Resend } from "resend";
import { getAlertEmailHtml } from "@/templates/alertEmail";

const resend = new Resend(process.env.RESEND_API_KEY);

function getMetricLabel(metric) {
  switch (metric) {
    case "avg_latency":
      return "Average latency";
    case "error_rate":
      return "Error rate";
    case "slow_pages":
      return "Slow pages count";
    case "total_errors":
      return "Total errors";
    default:
      return metric;
  }
}

function getMetricUnit(metric) {
  switch (metric) {
    case "avg_latency":
      return "ms";
    case "error_rate":
      return "%";
    case "slow_pages":
      return " pages";
    case "total_errors":
      return " errors";
    default:
      return "";
  }
}

function formatValue(value, metric) {
  if (metric === "avg_latency")
    return `${Math.round(value).toLocaleString()}ms`;
  if (metric === "error_rate") return `${value.toFixed(1)}%`;
  if (metric === "slow_pages") return `${value} pages`;
  return `${value} errors`;
}

function getOverThresholdPercent(measured, threshold) {
  if (threshold === 0) return "+∞";
  const pct = Math.round(((measured - threshold) / threshold) * 100);
  return `+${pct}%`;
}

function getOverThresholdDelta(measured, threshold, metric) {
  const delta = Math.abs(measured - threshold);
  return `${formatValue(delta, metric)} above limit`;
}

export async function sendAlertEmail(data) {
  const {
    to,
    ruleName,
    domain,
    metric,
    measuredValue,
    threshold,
    firedAt,
    frequency,
  } = data;

  const metricLabel = getMetricLabel(metric);
  const formattedMeasured = formatValue(measuredValue, metric);
  const formattedThreshold = formatValue(threshold, metric);
  const overPct = getOverThresholdPercent(measuredValue, threshold);
  const overDelta = getOverThresholdDelta(measuredValue, threshold, metric);
  const timeStr = firedAt.toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const html = getAlertEmailHtml({
    ruleName,
    domain,
    metricLabel,
    formattedMeasured,
    formattedThreshold,
    overPct,
    overDelta,
    timeStr,
    frequency,
  });

  try {
    await resend.emails.send({
      from: "SentientLog Alerts <onboarding@resend.dev>",
      to: [to],
      subject: `Alert fired: ${ruleName}`,
      html,
    });
    return true;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}
