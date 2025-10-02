-- =====================================================
-- 包括的マスターデータ投入スクリプト
-- =====================================================

-- 注意: このスクリプトは database_schema.sql 実行後に実行してください

-- =====================================================
-- 1. 疾患カテゴリマスターデータ
-- =====================================================

-- 主要カテゴリ
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('MENTAL_HEALTH', NULL, 1),           -- 精神疾患
('NEUROLOGICAL', NULL, 2),             -- 神経疾患
('CARDIOVASCULAR', NULL, 3),          -- 循環器疾患
('RESPIRATORY', NULL, 4),             -- 呼吸器疾患
('ENDOCRINE', NULL, 5),                -- 内分泌疾患
('DIGESTIVE', NULL, 6),               -- 消化器疾患
('MUSCULOSKELETAL', NULL, 7),         -- 筋骨格系疾患
('AUTOIMMUNE', NULL, 8),              -- 自己免疫疾患
('ONCOLOGY', NULL, 9),                -- 腫瘍・がん
('RARE_DISEASES', NULL, 10);          -- 希少疾患

-- 精神疾患サブカテゴリ
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('MOOD_DISORDERS', 1, 1),             -- 気分障害
('ANXIETY_DISORDERS', 1, 2),          -- 不安障害
('PERSONALITY_DISORDERS', 1, 3),      -- パーソナリティ障害
('PSYCHOTIC_DISORDERS', 1, 4),        -- 精神病性障害
('EATING_DISORDERS', 1, 5),           -- 摂食障害
('ADDICTION_DISORDERS', 1, 6),        -- 依存症
('DEVELOPMENTAL_DISORDERS', 1, 7);     -- 発達障害

-- 神経疾患サブカテゴリ
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('EPILEPSY_SEIZURES', 2, 1),          -- てんかん・発作
('MOVEMENT_DISORDERS', 2, 2),          -- 運動障害
('DEMENTIA', 2, 3),                   -- 認知症
('MIGRAINE_HEADACHE', 2, 4),          -- 頭痛・片頭痛
('MULTIPLE_SCLEROSIS', 2, 5),         -- 多発性硬化症
('PARKINSON', 2, 6),                  -- パーキンソン病
('STROKE', 2, 7);                     -- 脳卒中

-- =====================================================
-- 2. 疾患状態マスターデータ
-- =====================================================

INSERT INTO disease_statuses (status_code, display_order) VALUES 
('ACTIVE', 1),                        -- 活動期
('REMISSION', 2),                     -- 寛解期
('STABLE', 3),                        -- 安定期
('CHRONIC', 4),                       -- 慢性期
('UNDER_TREATMENT', 5),               -- 治療中
('RECOVERED', 6),                     -- 回復
('PROGRESSIVE', 7),                   -- 進行性
('FLARE_UP', 8),                      -- 増悪期
('CONTROLLED', 9),                    -- コントロール良好
('MONITORING', 10);                   -- 経過観察中

-- =====================================================
-- 3. 疾患マスターデータ
-- =====================================================

-- 精神疾患
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
-- 気分障害
('F32.9', 'Major depressive disorder', 3),
('F33.9', 'Recurrent depressive disorder', 3),
('F31.9', 'Bipolar disorder', 4),
('F34.1', 'Dysthymia', 2),
('F38.0', 'Mixed affective episode', 4),

-- 不安障害
('F41.9', 'Anxiety disorder', 2),
('F41.0', 'Panic disorder', 3),
('F40.9', 'Phobic anxiety disorder', 2),
('F42.9', 'Obsessive-compulsive disorder', 3),
('F43.1', 'Post-traumatic stress disorder', 4),

-- パーソナリティ障害
('F60.9', 'Personality disorder', 3),
('F60.3', 'Borderline personality disorder', 4),
('F60.2', 'Antisocial personality disorder', 4),

-- 摂食障害
('F50.9', 'Eating disorder', 3),
('F50.0', 'Anorexia nervosa', 4),
('F50.2', 'Bulimia nervosa', 3),

-- 発達障害
('F84.0', 'Autism spectrum disorder', 3),
('F90.9', 'Attention deficit hyperactivity disorder', 2),
('F81.9', 'Specific learning disorder', 2),

-- 神経疾患
-- てんかん・発作
('G40.9', 'Epilepsy', 4),
('G40.1', 'Localization-related epilepsy', 4),
('G40.3', 'Generalized idiopathic epilepsy', 3),

-- 運動障害
('G20', 'Parkinson disease', 4),
('G25.9', 'Extrapyramidal disorder', 3),
('G24.1', 'Dystonia', 3),
('G25.1', 'Essential tremor', 2),

-- 認知症
('F03', 'Unspecified dementia', 5),
('G30.9', 'Alzheimer disease', 5),
('F01.9', 'Vascular dementia', 4),
('G31.0', 'Frontotemporal dementia', 4),

-- 頭痛・片頭痛
('G43.9', 'Migraine', 2),
('G44.1', 'Tension-type headache', 1),
('G44.0', 'Cluster headache', 3),

-- 多発性硬化症
('G35', 'Multiple sclerosis', 4),
('G36.9', 'Acute disseminated encephalomyelitis', 4),

-- 循環器疾患
('I25.9', 'Ischemic heart disease', 4),
('I21.9', 'Acute myocardial infarction', 5),
('I50.9', 'Heart failure', 4),
('I10', 'Essential hypertension', 2),
('I48.9', 'Atrial fibrillation', 3),
('I73.9', 'Peripheral vascular disease', 3),

-- 呼吸器疾患
('J45.9', 'Asthma', 2),
('J44.1', 'Chronic obstructive pulmonary disease', 3),
('J18.9', 'Pneumonia', 3),
('J47', 'Bronchiectasis', 3),
('J84.9', 'Interstitial lung disease', 4),

-- 内分泌疾患
('E11.9', 'Type 2 diabetes mellitus', 3),
('E10.9', 'Type 1 diabetes mellitus', 3),
('E03.9', 'Hypothyroidism', 2),
('E05.9', 'Hyperthyroidism', 2),
('E25.9', 'Adrenogenital disorder', 3),

-- 自己免疫疾患
('M06.9', 'Rheumatoid arthritis', 3),
('M32.9', 'Systemic lupus erythematosus', 4),
('M35.9', 'Sjogren syndrome', 3),
('K50.9', 'Crohn disease', 3),
('K51.9', 'Ulcerative colitis', 3),

-- 希少疾患
('G12.2', 'Amyotrophic lateral sclerosis', 5),
('G10', 'Huntington disease', 5),
('E75.9', 'Gaucher disease', 4),
('E76.0', 'Mucopolysaccharidosis', 4),
('D61.9', 'Aplastic anemia', 4);

-- =====================================================
-- 4. 疾患翻訳データ（日本語）
-- =====================================================

-- 精神疾患翻訳
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
-- 気分障害
(1, 'ja', 'うつ病', '気分の落ち込みが続く精神疾患。睡眠障害、食欲不振、集中力の低下などの症状が現れる。'),
(2, 'ja', '反復性うつ病', 'うつ病エピソードを繰り返す疾患。'),
(3, 'ja', '双極性障害', '気分が高揚する躁状態と落ち込むうつ状態を繰り返す疾患。'),
(4, 'ja', '気分変調症', '慢性的な軽度のうつ状態が続く疾患。'),
(5, 'ja', '混合性感情エピソード', '躁症状とうつ症状が同時に現れる状態。'),

-- 不安障害
(6, 'ja', '不安障害', '過度な不安や心配が続く疾患。'),
(7, 'ja', 'パニック障害', '突然の激しい不安発作を特徴とする疾患。'),
(8, 'ja', '恐怖症', '特定の状況や対象に対する過度な恐怖。'),
(9, 'ja', '強迫性障害', '強迫観念と強迫行為を特徴とする疾患。'),
(10, 'ja', '心的外傷後ストレス障害', 'トラウマ体験後に生じる精神疾患。'),

-- パーソナリティ障害
(11, 'ja', 'パーソナリティ障害', '思考や行動のパターンに問題がある疾患。'),
(12, 'ja', '境界性パーソナリティ障害', '感情の不安定さと対人関係の問題を特徴とする疾患。'),
(13, 'ja', '反社会性パーソナリティ障害', '他人の権利を無視する行動パターンを示す疾患。'),

-- 摂食障害
(14, 'ja', '摂食障害', '食事行動に異常をきたす精神疾患。'),
(15, 'ja', '神経性無食欲症', '極度の体重減少を伴う摂食障害。'),
(16, 'ja', '神経性大食症', '過食と排出行為を繰り返す摂食障害。'),

-- 発達障害
(17, 'ja', '自閉スペクトラム症', '社会的コミュニケーションの困難と限定された興味を特徴とする発達障害。'),
(18, 'ja', '注意欠如・多動症', '注意力の欠如と多動性を特徴とする発達障害。'),
(19, 'ja', '限局性学習症', '特定の学習領域に困難を示す発達障害。'),

-- 神経疾患翻訳
-- てんかん・発作
(20, 'ja', 'てんかん', '脳の異常な電気活動による発作性疾患。けいれんや意識障害を引き起こす。'),
(21, 'ja', '局在関連てんかん', '脳の特定部位から始まるてんかん。'),
(22, 'ja', '特発性全般てんかん', '原因不明の全般発作を特徴とするてんかん。'),

-- 運動障害
(23, 'ja', 'パーキンソン病', '手足の震え、動作の緩慢さ、筋肉の硬直を特徴とする神経変性疾患。'),
(24, 'ja', '錐体外路障害', '随意運動の制御に問題をきたす疾患。'),
(25, 'ja', 'ジストニア', '筋肉の不随意収縮により異常な姿勢や動作を生じる疾患。'),
(26, 'ja', '本態性振戦', '原因不明の手の震えを特徴とする疾患。'),

-- 認知症
(27, 'ja', '認知症', '記憶力や判断力の低下を特徴とする疾患。'),
(28, 'ja', 'アルツハイマー病', '最も一般的な認知症の原因疾患。'),
(29, 'ja', '血管性認知症', '脳血管障害により生じる認知症。'),
(30, 'ja', '前頭側頭型認知症', '前頭葉や側頭葉の萎縮により生じる認知症。'),

-- 頭痛・片頭痛
(31, 'ja', '片頭痛', '頭の片側に生じる激しい頭痛。'),
(32, 'ja', '緊張型頭痛', '頭全体を締め付けるような頭痛。'),
(33, 'ja', '群発頭痛', '目の周りに激しい痛みを生じる頭痛。'),

-- 多発性硬化症
(34, 'ja', '多発性硬化症', '中枢神経系の脱髄を特徴とする自己免疫疾患。'),
(35, 'ja', '急性散在性脳脊髄炎', 'ウイルス感染後に生じる脱髄疾患。'),

-- 循環器疾患翻訳
(36, 'ja', '虚血性心疾患', '心臓の血管が狭くなることで起こる疾患。心筋梗塞や狭心症を含む。'),
(37, 'ja', '急性心筋梗塞', '心臓の血管が完全に詰まることで生じる重篤な疾患。'),
(38, 'ja', '心不全', '心臓のポンプ機能が低下する疾患。'),
(39, 'ja', '本態性高血圧', '原因不明の高血圧。'),
(40, 'ja', '心房細動', '心臓のリズムが不規則になる不整脈。'),
(41, 'ja', '末梢血管疾患', '手足の血管が狭くなる疾患。'),

-- 呼吸器疾患翻訳
(42, 'ja', '喘息', '気道が炎症を起こし、呼吸困難を引き起こす疾患。'),
(43, 'ja', '慢性閉塞性肺疾患', '長期間の喫煙により生じる肺の疾患。'),
(44, 'ja', '肺炎', '肺に炎症が生じる感染症。'),
(45, 'ja', '気管支拡張症', '気管支が拡張し、感染を繰り返す疾患。'),
(46, 'ja', '間質性肺疾患', '肺の間質に炎症が生じる疾患群。'),

-- 内分泌疾患翻訳
(47, 'ja', '2型糖尿病', 'インスリンの作用不足により生じる糖尿病。'),
(48, 'ja', '1型糖尿病', 'インスリン産生細胞の破壊により生じる糖尿病。'),
(49, 'ja', '甲状腺機能低下症', '甲状腺ホルモンの分泌が不足する疾患。'),
(50, 'ja', '甲状腺機能亢進症', '甲状腺ホルモンの分泌が過剰な疾患。'),
(51, 'ja', '副腎性器症候群', '副腎ホルモンの異常により生じる疾患。'),

-- 自己免疫疾患翻訳
(52, 'ja', '関節リウマチ', '関節の炎症を特徴とする自己免疫疾患。'),
(53, 'ja', '全身性エリテマトーデス', '全身の臓器に炎症を生じる自己免疫疾患。'),
(54, 'ja', 'シェーグレン症候群', '涙腺や唾液腺の炎症を特徴とする自己免疫疾患。'),
(55, 'ja', 'クローン病', '消化管の炎症を特徴とする自己免疫疾患。'),
(56, 'ja', '潰瘍性大腸炎', '大腸の炎症を特徴とする自己免疫疾患。'),

-- 希少疾患翻訳
(57, 'ja', '筋萎縮性側索硬化症', '運動神経の変性により筋力低下を生じる疾患。'),
(58, 'ja', 'ハンチントン病', '遺伝性の神経変性疾患。'),
(59, 'ja', 'ゴーシェ病', 'リソソーム病の一種。'),
(60, 'ja', 'ムコ多糖症', 'ムコ多糖の蓄積により生じる疾患。'),
(61, 'ja', '再生不良性貧血', '骨髄の造血機能が低下する疾患。');

-- =====================================================
-- 5. 疾患翻訳データ（英語）
-- =====================================================

-- 精神疾患翻訳（英語）
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
-- 気分障害
(1, 'en', 'Major Depressive Disorder', 'A mood disorder causing persistent sadness and loss of interest.'),
(2, 'en', 'Recurrent Depressive Disorder', 'Repeated episodes of depression.'),
(3, 'en', 'Bipolar Disorder', 'A disorder characterized by alternating manic and depressive episodes.'),
(4, 'en', 'Dysthymia', 'A chronic form of mild depression.'),
(5, 'en', 'Mixed Affective Episode', 'A state with both manic and depressive symptoms.'),

-- 不安障害
(6, 'en', 'Anxiety Disorder', 'A disorder characterized by excessive anxiety and worry.'),
(7, 'en', 'Panic Disorder', 'A disorder characterized by sudden, intense anxiety attacks.'),
(8, 'en', 'Phobic Anxiety Disorder', 'Excessive fear of specific situations or objects.'),
(9, 'en', 'Obsessive-Compulsive Disorder', 'A disorder characterized by obsessions and compulsions.'),
(10, 'en', 'Post-Traumatic Stress Disorder', 'A disorder that develops after exposure to traumatic events.'),

-- パーソナリティ障害
(11, 'en', 'Personality Disorder', 'A disorder affecting patterns of thinking and behavior.'),
(12, 'en', 'Borderline Personality Disorder', 'A disorder characterized by emotional instability and relationship problems.'),
(13, 'en', 'Antisocial Personality Disorder', 'A disorder characterized by disregard for others\' rights.'),

-- 摂食障害
(14, 'en', 'Eating Disorder', 'A mental disorder affecting eating behavior.'),
(15, 'en', 'Anorexia Nervosa', 'An eating disorder characterized by extreme weight loss.'),
(16, 'en', 'Bulimia Nervosa', 'An eating disorder characterized by binge eating and purging.'),

-- 発達障害
(17, 'en', 'Autism Spectrum Disorder', 'A developmental disorder affecting social communication and behavior.'),
(18, 'en', 'Attention Deficit Hyperactivity Disorder', 'A developmental disorder affecting attention and hyperactivity.'),
(19, 'en', 'Specific Learning Disorder', 'A developmental disorder affecting specific learning areas.'),

-- 神経疾患翻訳（英語）
-- てんかん・発作
(20, 'en', 'Epilepsy', 'A neurological disorder with recurrent seizures.'),
(21, 'en', 'Localization-Related Epilepsy', 'Epilepsy originating from specific brain regions.'),
(22, 'en', 'Generalized Idiopathic Epilepsy', 'Epilepsy with unknown cause affecting the whole brain.'),

-- 運動障害
(23, 'en', 'Parkinson Disease', 'A neurodegenerative disorder affecting movement.'),
(24, 'en', 'Extrapyramidal Disorder', 'A disorder affecting motor control.'),
(25, 'en', 'Dystonia', 'A movement disorder causing involuntary muscle contractions.'),
(26, 'en', 'Essential Tremor', 'A neurological disorder causing involuntary shaking.'),

-- 認知症
(27, 'en', 'Dementia', 'A disorder affecting memory and cognitive function.'),
(28, 'en', 'Alzheimer Disease', 'The most common cause of dementia.'),
(29, 'en', 'Vascular Dementia', 'Dementia caused by cerebrovascular disease.'),
(30, 'en', 'Frontotemporal Dementia', 'Dementia affecting the frontal and temporal lobes.'),

-- 頭痛・片頭痛
(31, 'en', 'Migraine', 'A neurological disorder causing severe headaches.'),
(32, 'en', 'Tension-Type Headache', 'A common type of headache.'),
(33, 'en', 'Cluster Headache', 'A severe type of headache occurring in clusters.'),

-- 多発性硬化症
(34, 'en', 'Multiple Sclerosis', 'An autoimmune disease affecting the central nervous system.'),
(35, 'en', 'Acute Disseminated Encephalomyelitis', 'A demyelinating disease following viral infection.'),

-- 循環器疾患翻訳（英語）
(36, 'en', 'Ischemic Heart Disease', 'Heart disease caused by narrowed coronary arteries.'),
(37, 'en', 'Acute Myocardial Infarction', 'Heart attack caused by blocked coronary arteries.'),
(38, 'en', 'Heart Failure', 'A condition where the heart cannot pump blood effectively.'),
(39, 'en', 'Essential Hypertension', 'High blood pressure with no known cause.'),
(40, 'en', 'Atrial Fibrillation', 'An irregular heart rhythm.'),
(41, 'en', 'Peripheral Vascular Disease', 'Disease affecting blood vessels outside the heart.'),

-- 呼吸器疾患翻訳（英語）
(42, 'en', 'Asthma', 'A chronic inflammatory disease of the airways.'),
(43, 'en', 'Chronic Obstructive Pulmonary Disease', 'A lung disease caused by long-term smoking.'),
(44, 'en', 'Pneumonia', 'Inflammation of the lungs caused by infection.'),
(45, 'en', 'Bronchiectasis', 'A condition where airways become abnormally widened.'),
(46, 'en', 'Interstitial Lung Disease', 'A group of diseases affecting the lung tissue.'),

-- 内分泌疾患翻訳（英語）
(47, 'en', 'Type 2 Diabetes Mellitus', 'Diabetes caused by insulin resistance.'),
(48, 'en', 'Type 1 Diabetes Mellitus', 'Diabetes caused by destruction of insulin-producing cells.'),
(49, 'en', 'Hypothyroidism', 'Underactive thyroid gland.'),
(50, 'en', 'Hyperthyroidism', 'Overactive thyroid gland.'),
(51, 'en', 'Adrenogenital Syndrome', 'A disorder affecting adrenal gland function.'),

-- 自己免疫疾患翻訳（英語）
(52, 'en', 'Rheumatoid Arthritis', 'An autoimmune disease affecting joints.'),
(53, 'en', 'Systemic Lupus Erythematosus', 'An autoimmune disease affecting multiple organs.'),
(54, 'en', 'Sjogren Syndrome', 'An autoimmune disease affecting tear and salivary glands.'),
(55, 'en', 'Crohn Disease', 'An autoimmune disease affecting the digestive tract.'),
(56, 'en', 'Ulcerative Colitis', 'An autoimmune disease affecting the colon.'),

-- 希少疾患翻訳（英語）
(57, 'en', 'Amyotrophic Lateral Sclerosis', 'A neurodegenerative disease affecting motor neurons.'),
(58, 'en', 'Huntington Disease', 'A hereditary neurodegenerative disease.'),
(59, 'en', 'Gaucher Disease', 'A lysosomal storage disease.'),
(60, 'en', 'Mucopolysaccharidosis', 'A group of inherited metabolic disorders.'),
(61, 'en', 'Aplastic Anemia', 'A condition where bone marrow fails to produce blood cells.');

-- =====================================================
-- 6. カテゴリ翻訳データ
-- =====================================================

-- 主要カテゴリ翻訳（日本語）
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(1, 'ja', '精神疾患', '精神的な健康に関する疾患'),
(2, 'ja', '神経疾患', '神経系に関する疾患'),
(3, 'ja', '循環器疾患', '心臓や血管に関する疾患'),
(4, 'ja', '呼吸器疾患', '肺や気道に関する疾患'),
(5, 'ja', '内分泌疾患', 'ホルモンに関する疾患'),
(6, 'ja', '消化器疾患', '消化管に関する疾患'),
(7, 'ja', '筋骨格系疾患', '骨や筋肉に関する疾患'),
(8, 'ja', '自己免疫疾患', '免疫システムの異常による疾患'),
(9, 'ja', '腫瘍・がん', '腫瘍性疾患'),
(10, 'ja', '希少疾患', '患者数が少ない疾患');

-- 主要カテゴリ翻訳（英語）
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(1, 'en', 'Mental Health', 'Disorders related to mental health'),
(2, 'en', 'Neurological', 'Disorders of the nervous system'),
(3, 'en', 'Cardiovascular', 'Disorders of the heart and blood vessels'),
(4, 'en', 'Respiratory', 'Disorders of the lungs and airways'),
(5, 'en', 'Endocrine', 'Disorders of the endocrine system'),
(6, 'en', 'Digestive', 'Disorders of the digestive system'),
(7, 'en', 'Musculoskeletal', 'Disorders of bones and muscles'),
(8, 'en', 'Autoimmune', 'Disorders caused by immune system dysfunction'),
(9, 'en', 'Oncology', 'Tumor-related diseases'),
(10, 'en', 'Rare Diseases', 'Diseases with low prevalence');

-- サブカテゴリ翻訳（日本語）
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(11, 'ja', '気分障害', 'うつ病や双極性障害などの気分に関する疾患'),
(12, 'ja', '不安障害', '過度な不安や恐怖を特徴とする疾患'),
(13, 'ja', 'パーソナリティ障害', '思考や行動のパターンに問題がある疾患'),
(14, 'ja', '精神病性障害', '現実認識に問題をきたす疾患'),
(15, 'ja', '摂食障害', '食事行動に異常をきたす疾患'),
(16, 'ja', '依存症', '物質や行動への依存を特徴とする疾患'),
(17, 'ja', '発達障害', '発達過程に問題をきたす疾患'),
(18, 'ja', 'てんかん・発作', '脳の異常な電気活動による発作性疾患'),
(19, 'ja', '運動障害', '随意運動の制御に問題をきたす疾患'),
(20, 'ja', '認知症', '記憶力や判断力の低下を特徴とする疾患'),
(21, 'ja', '頭痛・片頭痛', '頭痛を主症状とする疾患'),
(22, 'ja', '多発性硬化症', '中枢神経系の脱髄を特徴とする疾患'),
(23, 'ja', 'パーキンソン病', '運動障害を特徴とする神経変性疾患'),
(24, 'ja', '脳卒中', '脳血管障害により生じる疾患');

-- サブカテゴリ翻訳（英語）
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(11, 'en', 'Mood Disorders', 'Disorders affecting mood like depression and bipolar disorder'),
(12, 'en', 'Anxiety Disorders', 'Disorders characterized by excessive anxiety and fear'),
(13, 'en', 'Personality Disorders', 'Disorders affecting patterns of thinking and behavior'),
(14, 'en', 'Psychotic Disorders', 'Disorders affecting reality perception'),
(15, 'en', 'Eating Disorders', 'Disorders affecting eating behavior'),
(16, 'en', 'Addiction Disorders', 'Disorders characterized by substance or behavioral dependence'),
(17, 'en', 'Developmental Disorders', 'Disorders affecting development'),
(18, 'en', 'Epilepsy and Seizures', 'Disorders characterized by abnormal electrical activity in the brain'),
(19, 'en', 'Movement Disorders', 'Disorders affecting voluntary movement control'),
(20, 'en', 'Dementia', 'Disorders affecting memory and cognitive function'),
(21, 'en', 'Headache and Migraine', 'Disorders characterized by headaches'),
(22, 'en', 'Multiple Sclerosis', 'An autoimmune disease affecting the central nervous system'),
(23, 'en', 'Parkinson Disease', 'A neurodegenerative disorder affecting movement'),
(24, 'en', 'Stroke', 'Disorders caused by cerebrovascular disease');

-- =====================================================
-- 7. 状態翻訳データ
-- =====================================================

-- 状態翻訳（日本語）
INSERT INTO disease_status_translations (status_id, language_code, translated_name, description) VALUES 
(1, 'ja', '活動期', '症状が現れている状態'),
(2, 'ja', '寛解期', '症状が一時的に改善している状態'),
(3, 'ja', '安定期', '症状が安定している状態'),
(4, 'ja', '慢性期', '長期間にわたって症状が続く状態'),
(5, 'ja', '治療中', '現在治療を受けている状態'),
(6, 'ja', '回復', '症状が改善し、正常な状態に戻った状態'),
(7, 'ja', '進行性', '症状が徐々に悪化している状態'),
(8, 'ja', '増悪期', '症状が急激に悪化している状態'),
(9, 'ja', 'コントロール良好', '症状が適切に管理されている状態'),
(10, 'ja', '経過観察中', '定期的な検査や観察を行っている状態');

-- 状態翻訳（英語）
INSERT INTO disease_status_translations (status_id, language_code, translated_name, description) VALUES 
(1, 'en', 'Active', 'Symptoms are currently present'),
(2, 'en', 'Remission', 'Symptoms are temporarily improved'),
(3, 'en', 'Stable', 'Symptoms are stable'),
(4, 'en', 'Chronic', 'Long-term persistent symptoms'),
(5, 'en', 'Under Treatment', 'Currently receiving treatment'),
(6, 'en', 'Recovered', 'Symptoms have improved and returned to normal'),
(7, 'en', 'Progressive', 'Symptoms are gradually worsening'),
(8, 'en', 'Flare-up', 'Symptoms are rapidly worsening'),
(9, 'en', 'Well Controlled', 'Symptoms are properly managed'),
(10, 'en', 'Under Monitoring', 'Regular check-ups and monitoring are being performed');

-- =====================================================
-- 8. 疾患-カテゴリ関連データ
-- =====================================================

-- 精神疾患の関連
INSERT INTO disease_category_mappings (disease_id, category_id) VALUES 
-- 気分障害
(1, 11), -- うつ病 -> 気分障害
(2, 11), -- 反復性うつ病 -> 気分障害
(3, 11), -- 双極性障害 -> 気分障害
(4, 11), -- 気分変調症 -> 気分障害
(5, 11), -- 混合性感情エピソード -> 気分障害

-- 不安障害
(6, 12), -- 不安障害 -> 不安障害
(7, 12), -- パニック障害 -> 不安障害
(8, 12), -- 恐怖症 -> 不安障害
(9, 12), -- 強迫性障害 -> 不安障害
(10, 12), -- PTSD -> 不安障害

-- パーソナリティ障害
(11, 13), -- パーソナリティ障害 -> パーソナリティ障害
(12, 13), -- 境界性パーソナリティ障害 -> パーソナリティ障害
(13, 13), -- 反社会性パーソナリティ障害 -> パーソナリティ障害

-- 摂食障害
(14, 15), -- 摂食障害 -> 摂食障害
(15, 15), -- 神経性無食欲症 -> 摂食障害
(16, 15), -- 神経性大食症 -> 摂食障害

-- 発達障害
(17, 17), -- 自閉スペクトラム症 -> 発達障害
(18, 17), -- ADHD -> 発達障害
(19, 17), -- 限局性学習症 -> 発達障害

-- 神経疾患の関連
-- てんかん・発作
(20, 18), -- てんかん -> てんかん・発作
(21, 18), -- 局在関連てんかん -> てんかん・発作
(22, 18), -- 特発性全般てんかん -> てんかん・発作

-- 運動障害
(23, 19), -- パーキンソン病 -> 運動障害
(24, 19), -- 錐体外路障害 -> 運動障害
(25, 19), -- ジストニア -> 運動障害
(26, 19), -- 本態性振戦 -> 運動障害

-- 認知症
(27, 20), -- 認知症 -> 認知症
(28, 20), -- アルツハイマー病 -> 認知症
(29, 20), -- 血管性認知症 -> 認知症
(30, 20), -- 前頭側頭型認知症 -> 認知症

-- 頭痛・片頭痛
(31, 21), -- 片頭痛 -> 頭痛・片頭痛
(32, 21), -- 緊張型頭痛 -> 頭痛・片頭痛
(33, 21), -- 群発頭痛 -> 頭痛・片頭痛

-- 多発性硬化症
(34, 22), -- 多発性硬化症 -> 多発性硬化症
(35, 22), -- 急性散在性脳脊髄炎 -> 多発性硬化症

-- 循環器疾患の関連
(36, 3), -- 虚血性心疾患 -> 循環器疾患
(37, 3), -- 急性心筋梗塞 -> 循環器疾患
(38, 3), -- 心不全 -> 循環器疾患
(39, 3), -- 本態性高血圧 -> 循環器疾患
(40, 3), -- 心房細動 -> 循環器疾患
(41, 3), -- 末梢血管疾患 -> 循環器疾患

-- 呼吸器疾患の関連
(42, 4), -- 喘息 -> 呼吸器疾患
(43, 4), -- 慢性閉塞性肺疾患 -> 呼吸器疾患
(44, 4), -- 肺炎 -> 呼吸器疾患
(45, 4), -- 気管支拡張症 -> 呼吸器疾患
(46, 4), -- 間質性肺疾患 -> 呼吸器疾患

-- 内分泌疾患の関連
(47, 5), -- 2型糖尿病 -> 内分泌疾患
(48, 5), -- 1型糖尿病 -> 内分泌疾患
(49, 5), -- 甲状腺機能低下症 -> 内分泌疾患
(50, 5), -- 甲状腺機能亢進症 -> 内分泌疾患
(51, 5), -- 副腎性器症候群 -> 内分泌疾患

-- 自己免疫疾患の関連
(52, 8), -- 関節リウマチ -> 自己免疫疾患
(53, 8), -- 全身性エリテマトーデス -> 自己免疫疾患
(54, 8), -- シェーグレン症候群 -> 自己免疫疾患
(55, 8), -- クローン病 -> 自己免疫疾患
(56, 8), -- 潰瘍性大腸炎 -> 自己免疫疾患

-- 希少疾患の関連
(57, 10), -- 筋萎縮性側索硬化症 -> 希少疾患
(58, 10), -- ハンチントン病 -> 希少疾患
(59, 10), -- ゴーシェ病 -> 希少疾患
(60, 10), -- ムコ多糖症 -> 希少疾患
(61, 10); -- 再生不良性貧血 -> 希少疾患

-- =====================================================
-- 完了メッセージ
-- =====================================================
SELECT 'Comprehensive master data inserted successfully!' as message;
