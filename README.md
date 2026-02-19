# Music Mission Control – Dev Handbuch

## Stack
- Next.js 14, Tailwind CSS, TypeScript
- Supabase (Auth, DB, RLS, Storage)
- Deployment: Vercel; DB/Storage remain on Supabase

## Lokales Setup
1) `.env.local` anlegen
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```
2) Install & Start
```
npm install
npm run dev
```
Läuft auf http://localhost:3000 (Port-Konflikte vorher beenden).

## RLS / Policies
- Alle Kern-Tabellen haben RLS aktiviert. Policies liegen in `supabase_policies.sql` (letzte Version mit `cm_self_read`, um Rekursion zu vermeiden).
- Admin immer volle Rechte über View `v_admin` (profiles.role = 'admin').
- Materials: Teachers sehen visibility in ('teachers','both'), Students sehen ('students','both') und nur bei Kurszuordnung (course_members).
- Bookings: Admin full, Teacher nur für eigene Kurstermine, Student für eigene E-Mail / user_id.

## Navigation & Rollenrechte
- Seiten-Slugs: `dashboard`, `admin/bookings`, `admin/leads`, `admin/materials`, `admin/partners`, `admin/courses`, `admin/course-dates`, `admin/students`, `admin/members`, `teacher`, `teacher/materials`, `student`, `student/materials`, `partner`.
- Im Layout werden beim Admin fehlende Slugs automatisch in `role_permissions` erlaubt.
- Rollensteuerung UI: Seite Rollen & Rechte (Tab Seiten) steuert Sichtbarkeit; neue Seiten erscheinen automatisch, Admin standardmäßig erlaubt.

## Wichtige Screens
- Admin Dashboard: Partner-KPIs je Partner (Buchungen Monat/Jahr + VJ, Umsatz Monat/Jahr + VJ).
- Leads & Kursteilnehmer: getrennte Views (Merge verworfen). Leads-Tab behält Notizen/Kanban.
- Teacher Dashboard: zeigt nur Kurse mit Startdatum, Teilnehmerliste Popups, Kursunterlagen-Filter nach Kurszuordnung.
- Student Dashboard: Countdown im Hero; Kursunterlagen gleiches Hero mit Countdown.

## APIs/Routes (Server Actions / API-Routen)
- `/api/admin/members` (Profiles/Rollen), `/api/admin/permissions` (role_permissions), `/api/admin/bookings`, `/api/teacher/courses` (Teilnehmerlisten), `/api/teacher/materials` (gefiltert nach course_members + visibility).

## Deployment
- Vercel baut Branch `main`. .env Variablen in Vercel hinterlegen (siehe oben).
- Supabase bleibt Single Source of Truth; Storage-Bucket `materials` privat.

## SQL Helpers
- Policies anwenden: Datei `supabase_policies.sql` im SQL-Editor ausführen.
- Aktive Policies listen:
```
select schemaname, tablename, policyname, cmd
from pg_policies
order by schemaname, tablename, policyname;
```

## Offen / ToDo
- Mögliche spätere Fusion Leads/Kursteilnehmer unter "Kundenstamm" (zurückgestellt).
- Konsistente UI-Themes weiter verfeinern.

## Kontakt
Christian Hasenbichler / Music Mission Control
