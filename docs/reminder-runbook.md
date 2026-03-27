# Kurstermin-Reminder (E-Mail an Admins)

Endpoint: `GET /api/admin/course-dates/reminder`  
Zweck: E-Mail an alle Admins, wenn Kurstermine bald oder schon laufen und kein späterer Termin (gleicher Kurs & Anbieter) existiert.

## Anforderungen
- ENV: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (optional `SMTP_FROM`, `APP_BASE_URL`)
- Optional: `CRON_SECRET` → schützt den Endpoint

## Manuell auslösen
```bash
# Domain anpassen, optional Secret mitgeben
curl -X GET \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://<deine-domain>/api/admin/course-dates/reminder
```

## Lokal testen
```bash
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=... \
REMINDER_URL=http://localhost:3000/api/admin/course-dates/reminder \
npm run dev &            # falls nötig
npm run reminder:trigger
```

## Cron (z.B. 07:00 täglich)
Rufe die URL per Scheduler auf, inkl. `Authorization: Bearer $CRON_SECRET`, wenn gesetzt.

## Mail-Inhalt
- Betreff: `⚠️ Kurstermine auffüllen – <heute>`
- Zeilen je Kurs: `Kurs · Anbieter · Start · Zeit` + Link `.../admin/course-dates?cloneFrom=<id>` (öffnet Folgetermin-Dialog vorbelegt, Datum neu setzen).
