-- Insert default exam
INSERT INTO subjects (id, name) VALUES ('d8c4d29e-297c-4860-91cd-b2360a875a6a', 'Pathology');
INSERT INTO subjects (id, name) VALUES ('a219e933-7d7b-43a0-8a47-f584e0988cc8', 'Pharmacology');

INSERT INTO topics (id, subject_id, name) VALUES ('901e1d0d-9b5a-45c1-8f81-5d07019cf399', 'd8c4d29e-297c-4860-91cd-b2360a875a6a', 'Hematology');
INSERT INTO topics (id, subject_id, name) VALUES ('f1f1d1aa-1a9e-4e4b-bbd7-1b125e9821a8', 'd8c4d29e-297c-4860-91cd-b2360a875a6a', 'Renal Pathology');

-- Questions
INSERT INTO questions (id, exam, subject_id, topic_id, question_text, explanation, key_learning_point, difficulty, question_type)
VALUES ('c9b0a1d4-8025-4c07-b2e1-4c123a6c1e19', 'INI-CET', 'd8c4d29e-297c-4860-91cd-b2360a875a6a', '901e1d0d-9b5a-45c1-8f81-5d07019cf399', 'A 45-year-old man presents with progressive fatigue and weakness. Laboratory studies reveal a macrocytic anemia with hypersegmented neutrophils. Which of the following is the most likely underlying mechanism?', 'The presence of macrocytic anemia and hypersegmented neutrophils is highly characteristic of megaloblastic anemia, which is caused by impaired DNA synthesis.', 'Macrocytosis + hypersegmented neutrophils = Megaloblastic anemia (Impaired DNA synthesis)', 'medium', 'clinical_vignette');

INSERT INTO question_options (question_id, option_text, is_correct, why_wrong)
VALUES 
('c9b0a1d4-8025-4c07-b2e1-4c123a6c1e19', 'Iron deficiency', FALSE, 'Iron deficiency causes microcytic hypochromic anemia.'),
('c9b0a1d4-8025-4c07-b2e1-4c123a6c1e19', 'Impaired DNA synthesis', TRUE, NULL),
('c9b0a1d4-8025-4c07-b2e1-4c123a6c1e19', 'Globin chain mutation', FALSE, 'Globin chain mutations (thalassemias) typically present with microcytosis.'),
('c9b0a1d4-8025-4c07-b2e1-4c123a6c1e19', 'Autoimmune hemolysis', FALSE, 'Autoimmune hemolysis presents with spherocytes and reticulocytosis, usually normocytic.');

-- Add more questions similarly...
