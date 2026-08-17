import { Resend } from "resend";  // Resend is the SDK for sending emails.
import { getAlertEmailHtml } from "@/templates/alertEmail";  // local function that builds the HTML body of the alert email.

const resend = new Resend(process.env.RESEND_API_KEY); // This creates a Resend client.

function getMetricLabel(metric) { // This helper converts internal metric names into readable labels.
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

function getMetricUnit(metric) { // This function returns the unit for a metric.
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

function formatValue(value, metric) {  // This formats a measured value or threshold for display.
  let formatted = value;
  if (metric === "avg_latency") formatted = Math.round(value).toLocaleString();
  else if (metric === "error_rate") formatted = value.toFixed(1);
  return `${formatted}${getMetricUnit(metric)}`;
}

function getDifferencePercent(measured, threshold, condition) {  // calculates how much the measured value differs from the threshold, as a percentage.
  if (threshold === 0) return condition === "gt" ? "+∞" : "-∞";
  const pct = Math.round(((measured - threshold) / threshold) * 100);
  return pct > 0 ? `+${pct}%` : `${pct}%`;
}

function getDifferenceDelta(measured, threshold, metric, condition) {  // calculates the absolute difference between measured value and threshold.
  const delta = Math.abs(measured - threshold);
  const direction = condition === "gt" ? "above" : "below";
  return `${formatValue(delta, metric)} ${direction} limit`;
}

export async function sendAlertEmail(data) {  // AlertChecker.js calls this when an alert fires. It receives a data object.
  const {
    to,
    ruleName,
    domain,
    metric,
    measuredValue,
    threshold,
    firedAt,
    frequency,
    condition,
  } = data;

  const metricLabel = getMetricLabel(metric);
  const formattedMeasured = formatValue(measuredValue, metric);
  const formattedThreshold = formatValue(threshold, metric);
  const diffPct = getDifferencePercent(measuredValue, threshold, condition);
  const diffDelta = getDifferenceDelta(measuredValue, threshold, metric, condition);
  const timeStr = firedAt.toLocaleString("en-US", { // Example: Aug 17, 2026, 10:45 AM
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
    diffPct,
    diffDelta,
    timeStr,
    frequency,
    condition,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: "SentientLog Alerts <onboarding@resend.dev>",
      to: [to],
      subject: `Alert fired: ${ruleName}`,
      html,
    });
    
    if (error) {
      console.error("Resend API error:", error);
      return false;
    }
    
    console.log(`Alert email successfully sent to ${to}`);
    return true;
  } catch (error) {
    console.error("Failed to send alert email:", error);
    return false;
  }
}
