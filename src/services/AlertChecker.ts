import { Alert } from '@/models/Alert';
import { AlertHistory } from '@/models/AlertHistory';
import { Event } from '@/models/Event';
import { sendAlertEmail } from '@/services/AlertEmailService';
import { clerkClient } from '@clerk/nextjs/server';

export async function computeMetric(
  metric: string,
  domain: string,
  userId: string,
  frequency: string
): Promise<number> {
  const now = new Date();
  
  let windowMs = 24 * 60 * 60 * 1000; // default daily
  if (frequency === '15m') windowMs = 15 * 60 * 1000;
  if (frequency === 'weekly') windowMs = 7 * 24 * 60 * 60 * 1000;
  if (frequency === 'monthly') windowMs = 30 * 24 * 60 * 60 * 1000;

  const windowStart = new Date(now.getTime() - windowMs);
  const baseFilter = {
    user_id: userId,
    'metadata.domain': domain,
    timestamp: { $gte: windowStart },
  };

  switch (metric) {
    case 'avg_latency': {
      const result = await Event.aggregate([
        { $match: baseFilter },
        { $group: { _id: null, avg: { $avg: '$latency_ms' } } },
      ]);
      return result[0]?.avg || 0;
    }
    case 'error_rate': {
      const [total, errors] = await Promise.all([
        Event.countDocuments(baseFilter),
        Event.countDocuments({ ...baseFilter, event_type: 'error' }),
      ]);
      if (total === 0) return 0;
      return (errors / total) * 100;
    }
    case 'slow_pages': {
      const result = await Event.aggregate([
        { $match: { ...baseFilter, latency_ms: { $gt: 1000 } } },
        { $group: { _id: '$url' } },
        { $count: 'count' },
      ]);
      return result[0]?.count || 0;
    }
    case 'total_errors': {
      return Event.countDocuments({ ...baseFilter, event_type: 'error' });
    }
    default:
      return 0;
  }
}

export function shouldFire(measured: number, condition: string, threshold: number): boolean {
  if (condition === 'gt') return measured > threshold;
  if (condition === 'lt') return measured < threshold;
  return false;
}

export function isDueForCheck(lastCheckedAt: Date | null, frequency: string): boolean {
  if (!lastCheckedAt) return true;
  
  let frequencyMs = 24 * 60 * 60 * 1000; // default daily
  if (frequency === '15m') frequencyMs = 15 * 60 * 1000;
  if (frequency === 'weekly') frequencyMs = 7 * 24 * 60 * 60 * 1000;
  if (frequency === 'monthly') frequencyMs = 30 * 24 * 60 * 60 * 1000;

  return Date.now() - new Date(lastCheckedAt).getTime() >= frequencyMs;
}

export async function runAlertChecks(userId?: string) {
  const query = userId ? { user_id: userId, enabled: true } : { enabled: true };
  const enabledAlerts = await Alert.find(query);

  const results: { name: string; fired: boolean; reason: string }[] = [];

  // Get users for email lookup if not provided
  let allUsers: any[] = [];
  if (!userId) {
    try {
      const client = await clerkClient();
      const userList = await client.users.getUserList();
      allUsers = userList.data;
    } catch (err) {
      console.warn('Could not fetch Clerk user list for background check');
    }
  }

  for (const alert of enabledAlerts) {
    // Check if due for check
    if (!isDueForCheck(alert.last_checked_at, alert.frequency)) {
      continue;
    }

    const now = new Date();
    
    // Update last_checked_at immediately
    await Alert.findByIdAndUpdate(alert._id, { $set: { last_checked_at: now } });

    // Compute current metric value
    const measuredValue = await computeMetric(alert.metric, alert.domain, alert.user_id, alert.frequency);

    // Check if threshold is crossed
    if (!shouldFire(measuredValue, alert.condition, alert.threshold)) {
      results.push({
        name: alert.name,
        fired: false,
        reason: `Value ${measuredValue.toFixed(1)} did not cross threshold ${alert.threshold}`,
      });
      continue;
    }

    // FIRE the alert
    // Record in history
    await AlertHistory.create({
      alert_id: alert._id,
      user_id: alert.user_id,
      rule_name: alert.name,
      domain: alert.domain,
      metric: alert.metric,
      measured_value: measuredValue,
      threshold: alert.threshold,
      fired_at: now,
    });

    // Update alert state
    await Alert.findByIdAndUpdate(alert._id, {
      $set: { last_fired_at: now },
      $inc: { total_firings: 1 },
    });

    // Find user email
    let userEmail = null;
    if (userId) {
      // In a manual trigger for a specific user, we rely on the route to send email,
      // but wait, let's just get it directly via Clerk client
      try {
        const client = await clerkClient();
        const user = await client.users.getUser(alert.user_id);
        userEmail = user.emailAddresses[0]?.emailAddress;
      } catch (e) { }
    } else {
      const user = allUsers.find(u => u.id === alert.user_id);
      userEmail = user?.emailAddresses?.[0]?.emailAddress;
    }

    // Send email notification
    if (userEmail && process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 're_REPLACE_ME') {
      await sendAlertEmail({
        to: userEmail,
        ruleName: alert.name,
        domain: alert.domain,
        metric: alert.metric,
        measuredValue,
        threshold: alert.threshold,
        firedAt: now,
        frequency: alert.frequency,
      });
    }

    results.push({
      name: alert.name,
      fired: true,
      reason: `Value ${measuredValue.toFixed(1)} crossed threshold ${alert.threshold}`,
    });
  }

  return {
    checked: enabledAlerts.length,
    fired: results.filter(r => r.fired).length,
    results
  };
}
