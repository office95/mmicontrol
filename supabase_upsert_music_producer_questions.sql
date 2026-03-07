-- Upsert questions for survey Music Producer
insert into public.course_survey_questions (id, survey_id, qtype, prompt, options, required, position, extra_text_label, extra_text_required)
values
  ('10c13e5c-fd3f-45bd-bfc9-2f57cacdfa18', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'single', 'Hast du bereits Erfahrung in der Musikproduktion?', '{"choices": ["Ja", "Nein"]}', true, 1, null, false),
  ('15bdfae7-0e47-4988-8f66-e99ffe0d99ca', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 7', null, true, 7, null, false),
  ('2e21e989-13df-48ea-bcff-8037b087839d', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'multiselect', 'Welche Genres oder Musikstile interessieren dich besonders?', '{"choices": ["House", "EDM", "Techno", "Dance", "Drum & Bass", "Hip Hop", "Trap", "R&B", "Pop", "Rock", "Schlager", "Sontiges"]}', true, 6, null, false),
  ('3144ffc0-0756-4d0f-a5cb-43a75c14eba1', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'textarea', 'Falls ja, bei welchem Anbieter hast du diese Kurse gemacht?', '{"choices": []}', false, 9, null, false),
  ('41a461a7-2c0b-4fb5-af69-0b6a9f08c69e', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 5', null, true, 5, null, false),
  ('59e17791-5a03-4204-a8ef-869e89c91ded', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 12', null, true, 12, null, false),
  ('6665fb14-ed48-4d1a-a34f-52f34d5eaf76', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 1', null, true, 1, null, false),
  ('8149367f-18bc-4f14-ac78-595aaf21422b', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 2', null, true, 2, null, false),
  ('85e0c71d-4258-433b-98ae-06fcf7dec5af', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 8', null, true, 8, null, false),
  ('8f197983-e0b6-455b-a5fd-6b4a1bd5d573', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'single', 'Hast du schon an Musikproduktionskursen teilgenommen?', '{"choices": ["Ja", "Nein"]}', true, 8, null, false),
  ('9e76d430-fcba-4ff7-88a2-eb69cea575c7', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'single', 'Hast du Erfahrung mit DAWs (Digital Audio Workstations)?', '{"choices": ["Ja", "Nein"]}', true, 4, null, false),
  ('a5ab2139-837d-4af6-9af4-6742c734192c', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 10', null, true, 10, null, false),
  ('b79172ee-89b6-4240-bd61-22ff286b8d42', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 11', null, true, 11, null, false),
  ('bacbb713-02c2-4726-bae4-c0da52af96e6', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'multiselect', 'Falls ja, welche DAWs hast du bereits genutzt?', '{"choices": ["Ableton", "Cubase", "FL Studio", "Logic Pro", "Pro Tools", "Studio Onde", "Sonstige"]}', false, 5, null, false),
  ('d3161f04-b345-4a2e-8425-661c5fff05f5', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'single', 'Wie schätzt du dein aktuelles Wissen in der Musikproduktion ein?', '{"choices": ["Anfänger – ich habe bisher keine oder sehr wenig Erfahrung", "Basiskenntnisse – ich kenne einfache Grundlagen und habe schon etwas ausprobiert", "Fortgeschritten – ich habe eigene Projekte umgesetzt und arbeite regelmäßig damit", "Profi – ich habe viel Erfahrung, produziere regelmäßig und beherrsche verschiedene Tools & Techniken"]}', true, 3, null, false),
  ('dc7ec2a7-0be6-4015-8ff2-5683e3ee9d6b', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 4', null, true, 4, null, false),
  ('df557bfe-26af-4746-a00f-4b823e943fac', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 6', null, true, 6, null, false),
  ('e8bf8e88-9349-4a48-95aa-d40712842965', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 9', null, true, 9, null, false),
  ('f2d5b97b-74f1-4c46-bddc-ca3080074c01', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'text', '(import) Frage 3', null, true, 3, null, false),
  ('f35007c0-fa79-4cfa-842c-9ae6313c1076', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'textarea', 'Was sind deine Hauptziele für diesen Kurs?', '{"choices": []}', true, 7, null, false),
  ('fe3f602e-9cb3-476f-88d3-ecd39cf6a479', '3e424a3c-0501-4908-9586-9fc7eff1709e', 'single', 'Falls ja, wie lange beschäftigst du dich schon mit Musikproduktion?', '{"choices": ["Weniger als 1 Jahr", "1 Jahr bis 3 Jahre", "Mehr als 3 Jahre"]}', false, 2, null, false)
ON CONFLICT (id) DO UPDATE SET
  qtype = EXCLUDED.qtype,
  prompt = EXCLUDED.prompt,
  options = EXCLUDED.options,
  required = EXCLUDED.required,
  position = EXCLUDED.position,
  extra_text_label = EXCLUDED.extra_text_label,
  extra_text_required = EXCLUDED.extra_text_required;
