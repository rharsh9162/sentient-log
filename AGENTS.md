<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->





# Handoff Prompt: SentientLog Code Explanation Continuation

We are working in `C:\Users\Harsh\Desktop\tmp_project\sentient-log`.

The user wants a beginner-friendly, step-by-step explanation of each meaningful code file in the project, one file at a time, in the best learning order. They are learning the codebase and often types `nxt` / `nxt file` to continue.

## User Preferences

- Do **not** explain generated/boilerplate/config files such as:
  - `package-lock.json`
  - `tsconfig.json`
  - `jsconfig.json`
  - `eslint.config.mjs`
  - `next.config.ts`
  - similar SDK/framework preinstalled/readymade config files
- Do **not** explain CSS/styling:
  - skip `src/app/globals.css`
  - inside JSX files, skip className/style/CSS visual details unless needed for logic
- User deleted `src/lib/api.js` and now uses Axios directly in files, so **do not explain `api.js` again**.
- Keep explanations very detailed, beginner-friendly, step-by-step.
- User especially needed extra explanation for Socket.IO/WebSockets syntax.
- Continue with the next un-explained meaningful code file.

## Project Overview

SentientLog is a Next.js analytics/observability app with:
- Custom `server.js` runtime because it needs Socket.IO.
- MongoDB/Mongoose for analytics events, alerts, and alert history.
- Clerk for auth and route protection.
- Socket.IO for real-time event streaming.
- Gemini AI through `@google/generative-ai` for Ask AI and dashboard insights.
- Inngest for scheduled alert checking.
- Resend for alert emails.
- Recharts for dashboard visualizations.
- Public tracker script at `public/script.js`.

High-level data flow:

```text
external website / internal dashboard
        |
        v
public/script.js tracker
        |
        v
Socket.IO /stream namespace OR HTTP /api/v1/ingest fallback
        |
        v
server.js / API route saves Event documents
        |
        v
dashboard Socket.IO /dashboard namespace receives event:new
        |
        v
dashboard pages update live stream, stats, charts
Alert flow:
Alert documents = rules
Event documents = raw analytics data
AlertChecker computes metrics from Event
if threshold crossed:
  create AlertHistory
  update Alert last_fired_at / total_firings
  optionally send Resend email
AI flow:
Ask AI page -> /api/v1/query -> AnalyticAgent.query()
Gemini returns MongoDB aggregation pipeline
pipeline is validated
user_id $match is injected
Event.aggregate(pipeline) runs
results returned to UI
Files Already Explained In Order
Do not repeat these unless user asks.
package.json
Explained scripts, dependencies, and why dev/start run node server.js.

server.js
Explained custom Next.js + HTTP + Socket.IO server.
Explained Mongo connection, inline Event schema, active visitor map, debounced visitor stats, /stream namespace, /dashboard namespace, rooms by user ID, broadcasting event:new.
User later asked specifically about WebSockets/Socket.IO syntax, so Socket.IO part was explained again in beginner terms:io = real-time server
namespace: io.of("/stream"), io.of("/dashboard")
listen: socket.on("eventName", callback)
send: socket.emit("eventName", data)
rooms: socket.join(userId)
room broadcast: namespace.to(userId).emit("event:new", evt)
tracker sends to /stream, dashboard listens on /dashboard.


next.config.ts
Explained, but user later said to skip config/readymade files going forward.

jsconfig.json
Explained, but user later said to skip config/readymade files going forward.

src/middleware.js
Clerk middleware.
Public routes:/
/login(.*)
/register(.*)
/api/v1/ingest
/api/v1/health
/api/inngest
/socket.io(.*)

Everything else protected with auth.protect().
Matcher excludes static assets.

src/lib/db.js
MongoDB connection manager.
Uses process.env.MONGODB_URI || mongodb://localhost:27017/sentient_log.
Caches connection/promise on global.mongooseCache.
Avoids duplicate connections during hot reload/serverless requests.

src/lib/getUser.js
Small Clerk helper.
auth() returns current userId.
Returns null if unauthenticated/error.
Used by API handler and ingest fallback.

src/lib/api-handler.js
withApiHandler(handler, options = { requireAuth: true }).
Connects DB.
Gets user ID if auth required.
Returns 401 if missing user.
Calls handler with { ...context, userId }.
Catches errors and returns 500 JSON.

src/lib/api.js
Explained originally as frontend API helper, but user then said they deleted it and replaced calls with Axios directly.
Do not explain again.

src/models/Event.js
Mongoose schema for analytics events:event_type: enum page_view, click, error, api_call
url
latency_ms
status_code
metadata: Mixed
session_id
user_id, indexed
timestamp

Indexes on timestamp, url, event_type.
Export pattern: mongoose.models.Event || mongoose.model(...).

src/models/Alert.jsMongoose schema for alert rules:user_id
name
domain
metric: enum avg_latency, error_rate, slow_pages, total_errors
condition: enum gt, lt
threshold
frequency: enum 15m, daily, weekly, monthly
enabled
last_fired_at
last_checked_at
total_firings

Uses { timestamps: true }.

src/models/AlertHistory.jsStores individual alert firing records:alert_id ObjectId ref Alert
user_id
rule_name
domain
metric
measured_value
threshold
fired_at

Index on fired_at: -1.
Explained relationship:Event = raw analytics data
Alert = rule
AlertHistory = record that rule fired.


src/services/CrawlerService.jsPowers Analyze Website.
extractLinks(html, baseUrl):regex finds href
skips javascript:, mailto:, tel:, data:
resolves relative URLs
keeps same hostname only
skips static resource extensions
removes hash
returns unique links.

extractTitle(html):regex reads <title>.

crawlPage(url, retries = 2):Axios GET with browser-like headers
timeout 12s, max redirects 5
measures latency with performance.now()
detects content type
extracts title and links if HTML
returns { result, links }
retry/backoff on error
returns error result with status_code: 0 on failure.

normalizeUrl(u):removes trailing slash except root
keeps query params
used for deduplication.


src/services/AnalyticAgent.jsGemini + MongoDB analytics service.
Imports GoogleGenerativeAI, connectDB, Event.
ALLOWED_OPERATORS safety list:$match, $group, $sort, $limit, $project, $unwind, $count, $addFields, $avg, $sum, $max, $min, $first, $last, $skip

SYSTEM_PROMPT instructs Gemini to return only JSON:{ pipeline, summary }
always include $limit
use metadata.domain for domain filters.

Constructor requires GEMINI_API_KEY.
query(question, domain, userId):connects DB
adds domain context if selected
uses gemini-2.5-flash
low temperature
asks Gemini
strips markdown fences
parses JSON
requires pipeline and summary
validates pipeline top-level operators
injects { $match: { user_id: userId } } with unshift
runs Event.aggregate(pipeline)
returns { question, pipeline, results, summary }.

validatePipeline(pipeline):checks array
checks each stage’s first key is allowed.

getInsights(domain, userId):builds baseFilter with user_id and optional domain
computes last 24h vs previous 24h stats
top 3 URLs
asks Gemini for exactly 5 JSON string insights
fallback messages on error.


src/services/AlertChecker.jsAlert engine.
Imports Alert, AlertHistory, Event, sendAlertEmail, clerkClient.
computeMetric(metric, domain, userId, frequency):creates time window from frequency:15m, daily = 24h, weekly, monthly = 30d

base filter:user_id
"metadata.domain"
timestamp >= windowStart

metrics:avg_latency: aggregate $avg: "$latency_ms"
error_rate: count total and errors, return percentage
slow_pages: latency > 1000, group by URL, count unique slow URLs
total_errors: count error events


shouldFire(measured, condition, threshold):gt: measured > threshold
lt: measured < threshold.

isDueForCheck(lastCheckedAt, frequency):if never checked, true
otherwise checks interval.

runAlertChecks(userId):if userId provided, checks only that user’s enabled alerts
otherwise checks all enabled alerts
fetches Clerk users for scheduled all-user check
skips alerts not due
updates last_checked_at
computes metric
if not crossed, pushes non-fired result
if crossed:creates AlertHistory
updates Alert last_fired_at
increments total_firings
finds Clerk user email
sends email if RESEND_API_KEY exists and is not placeholder
pushes fired result

returns { checked, fired, results }.

Note: checked is enabledAlerts.length, even if some were skipped as not due.

Current Likely Next File To Explain
Continue with the next meaningful code file after AlertChecker.js.
Recommended next file:
src/services/AlertEmailService.js
Then:
src/templates/alertEmail.js
src/inngest/client.js
src/inngest/functions.js
src/app/api/v1/health/route.js
src/app/api/v1/ingest/route.js
src/app/api/v1/logs/route.js
src/app/api/v1/stats/route.js
src/app/api/v1/clear/route.js
src/app/api/v1/query/route.js
src/app/api/v1/analyze/route.js
alert API routes
dashboard/layout/page components
public tracker public/script.js
remaining components, skipping styling details.
Before explaining each next file, read its current contents because user has made changes, especially after deleting src/lib/api.js.
Use commands like:
Get-Content -Raw src\services\AlertEmailService.js
For bracket routes on PowerShell, use -LiteralPath, e.g.:
Get-Content -Raw -LiteralPath 'src\app\api\v1\alerts\[id]\route.js'
Style For Continuing
When user says nxt, respond with the next file explanation only.
Keep format:
short intro
code references
explain imports
explain each function/block step by step
skip CSS/style details
summary at end
Do not make code changes unless user explicitly asks.