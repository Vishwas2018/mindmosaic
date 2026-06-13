-- Test fixture: ICAS Mathematics Year 5 — 4 MCQ items (q01, q05, q07-TBD, q08)
-- Generated for scripts/import-fable-content.ts test coverage
-- Expected: 3 emitted (q01 NUM.FR5→005, q05 GEO.SHAPE5I→008, q08 STAT.PROB5→009)
--           1 TBD (q07 ALG.PAT5I — no MindMosaic skill node)
-- UUIDs computed via build_seed.mjs uuid() deterministic SHA-256

-- Skills ---------------------------------------------------------------
insert into public.skills (id, code, name, strand) values ('69bef83a-0000-4059-8ffe-564ca07ccd0e', 'NUM.FR5', 'Fractions & decimals (Y5)', 'Number & Algebra') on conflict (code) do nothing;
insert into public.skills (id, code, name, strand) values ('64718d7f-0000-4045-8ce8-0d2d1ce0c197', 'GEO.SHAPE5I', 'Geometry (Y5)', 'Measurement & Space') on conflict (code) do nothing;
insert into public.skills (id, code, name, strand) values ('60725c1d-0000-4d62-8f2d-038bdad3b800', 'ALG.PAT5I', 'Patterns & relations (Y5)', 'Number & Algebra') on conflict (code) do nothing;
insert into public.skills (id, code, name, strand) values ('662f0a40-0000-4076-85a0-7193a9f4d7fd', 'STAT.PROB5', 'Chance & data (Y5)', 'Measurement & Space') on conflict (code) do nothing;

-- ===== ICAS · Mathematics · Year 5 =====
insert into public.questions (id, skill_id, question_type, year_level, difficulty, content) values ('7fa30548-0000-420c-860c-5f0a334b21fa', '69bef83a-0000-4059-8ffe-564ca07ccd0e', 'multiple_choice', 5, 3, '{"stem":"Which fraction is equivalent to 0.75?","options":[{"id":"A","label":"1/4"},{"id":"B","label":"3/5"},{"id":"C","label":"3/4"},{"id":"D","label":"7/5"}]}'::jsonb);
insert into public.question_answer_keys (question_id, key) values ('7fa30548-0000-420c-860c-5f0a334b21fa', '{"correct":["C"]}'::jsonb);
insert into public.questions (id, skill_id, question_type, year_level, difficulty, content) values ('7bf792c9-0000-46e0-8dbe-6239fa509d9d', '64718d7f-0000-4045-8ce8-0d2d1ce0c197', 'multiple_choice', 5, 4, '{"stem":"How many lines of symmetry does a regular hexagon have?","options":[{"id":"A","label":"3"},{"id":"B","label":"4"},{"id":"C","label":"6"},{"id":"D","label":"12"}]}'::jsonb);
insert into public.question_answer_keys (question_id, key) values ('7bf792c9-0000-46e0-8dbe-6239fa509d9d', '{"correct":["C"]}'::jsonb);
insert into public.questions (id, skill_id, question_type, year_level, difficulty, content) values ('7b4f8b51-0000-4a36-8ad3-7c7bd05c2d91', '60725c1d-0000-4d62-8f2d-038bdad3b800', 'multiple_choice', 5, 4, '{"stem":"A pattern follows the rule: multiply by 2, then subtract 3. If the input is 7, what is the output?","options":[{"id":"A","label":"11"},{"id":"B","label":"14"},{"id":"C","label":"17"},{"id":"D","label":"21"}]}'::jsonb);
insert into public.question_answer_keys (question_id, key) values ('7b4f8b51-0000-4a36-8ad3-7c7bd05c2d91', '{"correct":["A"]}'::jsonb);
insert into public.questions (id, skill_id, question_type, year_level, difficulty, content) values ('769e81c0-0000-414a-8be4-00b372c9ba84', '662f0a40-0000-4076-85a0-7193a9f4d7fd', 'multiple_choice', 5, 4, '{"stem":"A spinner has 10 equal sections numbered 1–10. What is the probability of spinning a multiple of 3?","options":[{"id":"A","label":"1/10"},{"id":"B","label":"3/10"},{"id":"C","label":"4/10"},{"id":"D","label":"5/10"}]}'::jsonb);
insert into public.question_answer_keys (question_id, key) values ('769e81c0-0000-414a-8be4-00b372c9ba84', '{"correct":["B"]}'::jsonb);
