import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { checkAlertsCron } from "@/inngest/functions";

// Create an API that serves zero or more functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [checkAlertsCron],
});
