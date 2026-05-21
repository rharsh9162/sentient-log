import { runAlertChecks } from './AlertChecker';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

class AlertCronService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.start();
  }

  start() {
    if (this.intervalId) return;

    // Run every 1 minute
    this.intervalId = setInterval(() => this.runCheck(), 60 * 1000);
    console.log('✅ AlertCron started (checking every 1 minute)');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ AlertCron stopped');
    }
  }

  private async runCheck() {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      await connectDB();
      const result = await runAlertChecks();
      if (result.checked > 0) {
        console.log(`[AlertCron] Checked ${result.checked} rules, fired ${result.fired}`);
      }
    } catch (err) {
      console.error('AlertCron error:', err);
    } finally {
      this.isRunning = false;
    }
  }
}

// Global instance for development hot-reloading
declare global {
  var alertCron: AlertCronService | undefined;
}

export const alertCron =
  global.alertCron ?? new AlertCronService();

if (process.env.NODE_ENV !== 'production') {
  global.alertCron = alertCron;
}
