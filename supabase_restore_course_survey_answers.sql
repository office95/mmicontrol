-- Restore missing course_survey_answers rows (Linda-Maria Frieß, Survey 3e424a3c-0501-4908-9586-9fc7eff1709e)
-- Run in Supabase SQL editor or psql. Safe to re-run (ON CONFLICT DO NOTHING).

insert into public.course_survey_answers (id, response_id, question_id, value, created_at, extra_text, archived_at)
values
  ('26d16750-efb5-4ade-b263-98a1d4a04e3a','93afec08-6387-4bc4-bbfb-54dc29500a7f','6665fb14-ed48-4d1a-a34f-52f34d5eaf76','Techno, Sontiges','2026-03-06 21:42:27.222762+00',null,null),
  ('5453d09a-1a3e-4535-a3a0-8dc2ba5a7df4','93afec08-6387-4bc4-bbfb-54dc29500a7f','8149367f-18bc-4f14-ac78-595aaf21422b','Nein','2026-03-06 21:42:27.222762+00',null,null),
  ('56bb32e7-e747-4b19-89e3-1c5192bc6c9c','93afec08-6387-4bc4-bbfb-54dc29500a7f','f2d5b97b-74f1-4c46-bddc-ca3080074c01','Frieß','2026-03-06 21:42:27.222762+00',null,null),
  ('6e5bcd66-d6e0-425c-93ac-e09fb73fce88','93afec08-6387-4bc4-bbfb-54dc29500a7f','dc7ec2a7-0be6-4015-8ff2-5683e3ee9d6b','', '2026-03-06 21:42:27.222762+00',null,null),
  ('7797529e-3ae9-4312-98d4-f9a7c03e2d47','93afec08-6387-4bc4-bbfb-54dc29500a7f','41a461a7-2c0b-4fb5-af69-0b6a9f08c69e','Anfänger – ich habe bisher keine oder sehr wenig Erfahrung','2026-03-06 21:42:27.222762+00',null,null),
  ('7cf94afa-f7d1-43c5-ad79-7bdd62d7754f','93afec08-6387-4bc4-bbfb-54dc29500a7f','df557bfe-26af-4746-a00f-4b823e943fac','Linda-Maria','2026-03-06 21:42:27.222762+00',null,null),
  ('9e0d73eb-8624-4be4-aa85-9a5b592a1fe2','93afec08-6387-4bc4-bbfb-54dc29500a7f','15bdfae7-0e47-4988-8f66-e99ffe0d99ca','FL Studio','2026-03-06 21:42:27.222762+00',null,null),
  ('aa3e6494-2c1e-4f1c-b409-2dbba6cc078a','93afec08-6387-4bc4-bbfb-54dc29500a7f','85e0c71d-4258-433b-98ae-06fcf7dec5af','', '2026-03-06 21:42:27.222762+00',null,null),
  ('ab520a0d-90b9-4a9b-a131-466806c9359b','93afec08-6387-4bc4-bbfb-54dc29500a7f','e8bf8e88-9349-4a48-95aa-d40712842965','Ich möchte meine Ideen selbst in Tracks verwandeln können','2026-03-06 21:42:27.222762+00',null,null),
  ('abab678f-adb9-4dfc-9817-1814fa02d8c0','93afec08-6387-4bc4-bbfb-54dc29500a7f','a5ab2139-837d-4af6-9af4-6742c734192c','lindamaria0309@gmx.at','2026-03-06 21:42:27.222762+00',null,null),
  ('afa6c249-aed5-4c44-a8b5-3bba82f5eccc','93afec08-6387-4bc4-bbfb-54dc29500a7f','b79172ee-89b6-4240-bd61-22ff286b8d42','Nein','2026-03-06 21:42:27.222762+00',null,null),
  ('d13fe593-b927-4b3b-9964-4e026ae363ee','93afec08-6387-4bc4-bbfb-54dc29500a7f','59e17791-5a03-4204-a8ef-869e89c91ded','Nein','2026-03-06 21:42:27.222762+00',null,null)
on conflict (id) do nothing;
