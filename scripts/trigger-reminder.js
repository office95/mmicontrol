// Trigger the course-date reminder endpoint.
// Usage:
//   REMINDER_URL=https://your-domain/api/admin/course-dates/reminder \
//   CRON_SECRET=... \
//   SMTP_* already set on the server \
//   npm run reminder:trigger

const url = process.env.REMINDER_URL || 'http://localhost:3000/api/admin/course-dates/reminder';
const secret = process.env.CRON_SECRET;

async function main() {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: secret ? { Authorization: `Bearer ${secret}` } : undefined,
    });
    const text = await res.text();
    console.log(`Status: ${res.status}`);
    console.log('Body:', text);
    if (!res.ok) process.exitCode = 1;
  } catch (err) {
    console.error('Request failed:', err);
    process.exitCode = 1;
  }
}

main();
