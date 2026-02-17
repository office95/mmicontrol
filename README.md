# LearnSpace (Music Mission Institute)

## Überblick (Stand: 17.02.2026)
- Rollen: `admin`, `teacher`, `student`; neue User brauchen Admin-Approval (`profiles.approved`).
- Tech: Next.js 14 (App Router), TypeScript, Tailwind, Supabase (Auth/DB/Storage), supabase-js v2.
- Layout: Dunkler Gradient, Glas-Sidebar, Header mit Rollenanzeige.
- Hauptseiten: `/admin`, `/admin/courses`, `/admin/materials`, `/admin/roles`, `/teacher`, `/student`.

## Features
- **Auth**: E-Mail/Passwort. Seiten: `/login`, `/register`, `/forgot` (Reset-Mail), `/reset` (neues Passwort).
- **Kurse**: CRUD, Preis Brutto/Netto, USt %, USt-Betrag €, Anzahlung, Saldo, Kategorie, Status (aktiv/inaktiv), Archiv/Reactivate.
- **Materialien**: `/admin/materials`, Modal mit Kurs-Dropdown, mehreren Zeilen (Titel, Modul 1–20, Sichtbarkeit, Datei, Cover). Liste mit Archivieren/Löschen.
- **RBAC**: Tabelle `role_permissions` (unique role+page_slug). UI `/admin/roles` toggelt Sichtbarkeit. Sidebar + Middleware respektieren die Flags.
- **Rollenanzeige**: Header + Sidebar zeigen aktuelle Rolle.

## ENV (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
NEXT_PUBLIC_APP_URL=http://localhost:3011
```
Ports/Domain anpassen; Supabase Auth Redirect auf `/reset`.

## Dev-Server
```
cd ~/Desktop/Learnspace
npm run dev -- --hostname 127.0.0.1 --port 3011
```
Bei Konflikt Port anpassen und `NEXT_PUBLIC_APP_URL`/Redirects mitziehen.

## Rollen & Rechte
- Slugs: `admin-dashboard` (/admin), `admin-roles` (/admin/roles), `courses` (/admin/courses), `materials` (/admin/materials), `teacher-dashboard` (/teacher), `student-dashboard` (/student).
- `/admin/roles` toggelt `role_permissions`; Sidebar filtert, Middleware blockt Aufruf.

## Auth/Reset
- Supabase Redirect URL: `http://localhost:3011/reset`
- Site URL: `http://localhost:3011`

## Wichtige Dateien
- `app/(dashboard)/layout.tsx` – Header/Sidebar, Permissions-Filter (Service-Client).
- `middleware.ts` – prüft Session + `role_permissions`, Redirect bei `allowed=false`.
- `app/(dashboard)/admin/roles/page.tsx` – Matrix mit Toggles (`router.refresh`).
- `app/api/admin/permissions/route.ts` – GET/POST Upsert (onConflict role,page_slug), Admin-Check.
- `components/material-modal.tsx` – Multi-Upload, Kurs-Dropdown, Module 1–20, Cover.
- `components/admin-course-form.tsx`, `components/admin-course-list.tsx`, `components/course-modal.tsx` – Kurs-CRUD.
- Auth-Seiten: `app/(auth)/(login|register|forgot|reset)/page.tsx`.

## DB & Policies (Kurz)
- Tabellen: `profiles`, `courses`, `modules`, `course_members`, `materials`, `quizzes`, `quiz_questions`, `quiz_attempts`, `integrations`, `role_permissions`.
- RLS aktiv; Admin via `public.is_admin(uid)` bekommt Vollzugriff.

## Recovery / Admin setzen
```
update profiles set approved=true, role='admin' where id='UUID';
-- falls Profil fehlt:
insert into profiles (id, full_name, role, approved)
values ('UUID','Admin','admin',true)
on conflict (id) do update set role='admin', approved=true;
```

## Storage
- Bucket `materials` (privat). Storage-Policy: Insert nur für Admin (`materials upload admin`).
- Upload-Pfade: `course/{course_id}/module/{moduleNumber optional}/{timestamp}-{filename}`

