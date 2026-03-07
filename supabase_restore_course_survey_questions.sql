-- Restore missing course_survey_questions from CSV export
-- Run in Supabase SQL editor. Safe to re-run (ON CONFLICT DO NOTHING).

insert into public.course_survey_questions (id, survey_id, qtype, prompt, options, required, position, extra_text_label, extra_text_required)
values
  ('10c13e5c-fd3f-45bd-bfc9-2f57cacdfa18','3e424a3c-0501-4908-9586-9fc7eff1709e','single','Hast du bereits Erfahrung in der Musikproduktion?','{\"choices\": [\"Ja\", \"Nein\"]}',true,1,'',false),
  ('a5ab2139-837d-4af6-9af4-6742c734192c','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Email','',true,2,'',false),
  ('df557bfe-26af-4746-a00f-4b823e943fac','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Vorname','',true,3,'',false),
  ('f2d5b97b-74f1-4c46-bddc-ca3080074c01','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Nachname','',true,4,'',false),
  ('dc7ec2a7-0be6-4015-8ff2-5683e3ee9d6b','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Telefonnummer','',false,5,'',false),
  ('41a461a7-2c0b-4fb5-af69-0b6a9f08c69e','3e424a3c-0501-4908-9586-9fc7eff1709e','single','Wie schätzt du dein aktuelles Wissen in der Musikproduktion ein?','{\"choices\": [\"Anfänger – ich habe bisher keine oder sehr wenig Erfahrung\", \"Fortgeschritten – ich habe bereits einige Projekte umgesetzt\", \"Experte – ich beherrsche die Musikproduktion professionell\"]}',true,6,'',false),
  ('6665fb14-ed48-4d1a-a34f-52f34d5eaf76','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Welche Genres oder Musikstile interessieren dich besonders?','',true,7,'',false),
  ('15bdfae7-0e47-4988-8f66-e99ffe0d99ca','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Falls ja, welche DAWs hast du bereits genutzt?','',false,8,'',false),
  ('85e0c71d-4258-433b-98ae-06fcf7dec5af','3e424a3c-0501-4908-9586-9fc7eff1709e','text','Falls ja, wie lange beschäftigst du dich schon mit Musikproduktion?','',false,9,'',false),
  ('e8bf8e88-9349-4a48-95aa-d40712842965','3e424a3c-0501-4908-9586-9fc7eff1709e','textarea','Was sind deine Hauptziele für diesen Kurs?','',true,10,'',false),
  ('b79172ee-89b6-4240-bd61-22ff286b8d42','3e424a3c-0501-4908-9586-9fc7eff1709e','single','Hast du Erfahrung mit DAWs (Digital Audio Workstations)?','{\"choices\": [\"Ja\", \"Nein\"]}',true,11,'',false),
  ('59e17791-5a03-4204-a8ef-869e89c91ded','3e424a3c-0501-4908-9586-9fc7eff1709e','single','Hast du schon an Musikproduktionskursen teilgenommen?','{\"choices\": [\"Ja\", \"Nein\"]}',true,12,'',false)
on conflict (id) do nothing;
