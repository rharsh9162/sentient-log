import { inngest } from './client';
import { runAlertChecks } from '@/services/AlertChecker';
import { connectDB } from '@/lib/db';

export const checkAlertsCron = inngest.createFunction(
  { id: 'check-alerts-cron', triggers: [{ cron: '* * * * *' }] }, // Runs every minute
  async ({ step }) => {
    // 1. Connect to DB (since Inngest runs in serverless, we ensure connection)
    await step.run('connect-to-db', async () => {
      await connectDB();
    });

    // 2. Run the alert check engine
    const result = await step.run('run-alert-checks', async () => {
      return await runAlertChecks();
    });

    return result;
  }
);
