# マスターデータ設計書

## 1. 疾患カテゴリ（DiseaseCategories）

### 主要カテゴリ（親カテゴリ）
```sql
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
```

### 精神疾患サブカテゴリ
```sql
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('MOOD_DISORDERS', 1, 1),             -- 気分障害
('ANXIETY_DISORDERS', 1, 2),          -- 不安障害
('PERSONALITY_DISORDERS', 1, 3),      -- パーソナリティ障害
('PSYCHOTIC_DISORDERS', 1, 4),        -- 精神病性障害
('EATING_DISORDERS', 1, 5),           -- 摂食障害
('ADDICTION_DISORDERS', 1, 6),        -- 依存症
('DEVELOPMENTAL_DISORDERS', 1, 7);    -- 発達障害
```

### 神経疾患サブカテゴリ
```sql
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('EPILEPSY_SEIZURES', 2, 1),          -- てんかん・発作
('MOVEMENT_DISORDERS', 2, 2),          -- 運動障害
('DEMENTIA', 2, 3),                   -- 認知症
('MIGRAINE_HEADACHE', 2, 4),          -- 頭痛・片頭痛
('MULTIPLE_SCLEROSIS', 2, 5),         -- 多発性硬化症
('PARKINSON', 2, 6),                  -- パーキンソン病
('STROKE', 2, 7);                     -- 脳卒中
```

## 2. 疾患状態（DiseaseStatuses）

### 一般的な疾患状態
```sql
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
```

## 3. 疾患マスターデータ（Diseases）

### 精神疾患
```sql
-- 気分障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F32.9', 'Major depressive disorder', 3),
('F33.9', 'Recurrent depressive disorder', 3),
('F31.9', 'Bipolar disorder', 4),
('F34.1', 'Dysthymia', 2),
('F38.0', 'Mixed affective episode', 4);

-- 不安障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F41.9', 'Anxiety disorder', 2),
('F41.0', 'Panic disorder', 3),
('F40.9', 'Phobic anxiety disorder', 2),
('F42.9', 'Obsessive-compulsive disorder', 3),
('F43.1', 'Post-traumatic stress disorder', 4);

-- パーソナリティ障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F60.9', 'Personality disorder', 3),
('F60.3', 'Borderline personality disorder', 4),
('F60.2', 'Antisocial personality disorder', 4);

-- 摂食障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F50.9', 'Eating disorder', 3),
('F50.0', 'Anorexia nervosa', 4),
('F50.2', 'Bulimia nervosa', 3);

-- 発達障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F84.0', 'Autism spectrum disorder', 3),
('F90.9', 'Attention deficit hyperactivity disorder', 2),
('F81.9', 'Specific learning disorder', 2);
```

### 神経疾患
```sql
-- てんかん・発作
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('G40.9', 'Epilepsy', 4),
('G40.1', 'Localization-related epilepsy', 4),
('G40.3', 'Generalized idiopathic epilepsy', 3);

-- 運動障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('G20', 'Parkinson disease', 4),
('G25.9', 'Extrapyramidal disorder', 3),
('G24.1', 'Dystonia', 3),
('G25.1', 'Essential tremor', 2);

-- 認知症
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F03', 'Unspecified dementia', 5),
('G30.9', 'Alzheimer disease', 5),
('F01.9', 'Vascular dementia', 4),
('G31.0', 'Frontotemporal dementia', 4);

-- 頭痛・片頭痛
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('G43.9', 'Migraine', 2),
('G44.1', 'Tension-type headache', 1),
('G44.0', 'Cluster headache', 3);

-- 多発性硬化症
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('G35', 'Multiple sclerosis', 4),
('G36.9', 'Acute disseminated encephalomyelitis', 4);
```

### 循環器疾患
```sql
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('I25.9', 'Ischemic heart disease', 4),
('I21.9', 'Acute myocardial infarction', 5),
('I50.9', 'Heart failure', 4),
('I10', 'Essential hypertension', 2),
('I48.9', 'Atrial fibrillation', 3),
('I73.9', 'Peripheral vascular disease', 3);
```

### 呼吸器疾患
```sql
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('J45.9', 'Asthma', 2),
('J44.1', 'Chronic obstructive pulmonary disease', 3),
('J18.9', 'Pneumonia', 3),
('J47', 'Bronchiectasis', 3),
('J84.9', 'Interstitial lung disease', 4);
```

### 内分泌疾患
```sql
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('E11.9', 'Type 2 diabetes mellitus', 3),
('E10.9', 'Type 1 diabetes mellitus', 3),
('E03.9', 'Hypothyroidism', 2),
('E05.9', 'Hyperthyroidism', 2),
('E25.9', 'Adrenogenital disorder', 3);
```

### 自己免疫疾患
```sql
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('M06.9', 'Rheumatoid arthritis', 3),
('M32.9', 'Systemic lupus erythematosus', 4),
('M35.9', 'Sjogren syndrome', 3),
('K50.9', 'Crohn disease', 3),
('K51.9', 'Ulcerative colitis', 3),
('G35', 'Multiple sclerosis', 4);
```

### 希少疾患（例）
```sql
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('G12.2', 'Amyotrophic lateral sclerosis', 5),
('G10', 'Huntington disease', 5),
('E75.9', 'Gaucher disease', 4),
('E76.0', 'Mucopolysaccharidosis', 4),
('D61.9', 'Aplastic anemia', 4);
```

## 4. 翻訳データの例

### 疾患翻訳（日本語）
```sql
-- うつ病
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(1, 'ja', 'うつ病', '気分の落ち込みが続く精神疾患。睡眠障害、食欲不振、集中力の低下などの症状が現れる。'),
(1, 'en', 'Depression', 'A mood disorder causing persistent sadness. Symptoms include sleep disturbances, appetite changes, and concentration difficulties.');

-- 双極性障害
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(3, 'ja', '双極性障害', '気分が高揚する躁状態と落ち込むうつ状態を繰り返す疾患。'),
(3, 'en', 'Bipolar Disorder', 'A disorder characterized by alternating manic and depressive episodes.');

-- てんかん
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(15, 'ja', 'てんかん', '脳の異常な電気活動による発作性疾患。けいれんや意識障害を引き起こす。'),
(15, 'en', 'Epilepsy', 'A neurological disorder with recurrent seizures caused by abnormal electrical activity in the brain.');
```

### カテゴリ翻訳（日本語）
```sql
-- 主要カテゴリ
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(1, 'ja', '精神疾患', '精神的な健康に関する疾患'),
(1, 'en', 'Mental Health', 'Disorders related to mental health'),
(2, 'ja', '神経疾患', '神経系に関する疾患'),
(2, 'en', 'Neurological', 'Disorders of the nervous system'),
(3, 'ja', '循環器疾患', '心臓や血管に関する疾患'),
(3, 'en', 'Cardiovascular', 'Disorders of the heart and blood vessels');

-- サブカテゴリ
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(11, 'ja', '気分障害', 'うつ病や双極性障害などの気分に関する疾患'),
(11, 'en', 'Mood Disorders', 'Disorders affecting mood like depression and bipolar disorder'),
(12, 'ja', '不安障害', '過度な不安や恐怖を特徴とする疾患'),
(12, 'en', 'Anxiety Disorders', 'Disorders characterized by excessive anxiety and fear');
```

### 状態翻訳（日本語）
```sql
INSERT INTO disease_status_translations (status_id, language_code, translated_name, description) VALUES 
(1, 'ja', '活動期', '症状が現れている状態'),
(1, 'en', 'Active', 'Symptoms are currently present'),
(2, 'ja', '寛解期', '症状が一時的に改善している状態'),
(2, 'en', 'Remission', 'Symptoms are temporarily improved'),
(3, 'ja', '安定期', '症状が安定している状態'),
(3, 'en', 'Stable', 'Symptoms are stable'),
(4, 'ja', '慢性期', '長期間にわたって症状が続く状態'),
(4, 'en', 'Chronic', 'Long-term persistent symptoms');
```

## 5. 疾患-カテゴリ関連データ

```sql
-- 精神疾患の関連
INSERT INTO disease_category_mappings (disease_id, category_id) VALUES 
(1, 11), -- うつ病 -> 気分障害
(3, 11), -- 双極性障害 -> 気分障害
(5, 12), -- 不安障害 -> 不安障害
(6, 12), -- パニック障害 -> 不安障害
(8, 13), -- パーソナリティ障害 -> パーソナリティ障害
(10, 15), -- 摂食障害 -> 摂食障害
(12, 16), -- 自閉症スペクトラム -> 発達障害
(13, 16); -- ADHD -> 発達障害

-- 神経疾患の関連
INSERT INTO disease_category_mappings (disease_id, category_id) VALUES 
(15, 18), -- てんかん -> てんかん・発作
(19, 19), -- パーキンソン病 -> 運動障害
(21, 20), -- アルツハイマー病 -> 認知症
(24, 21); -- 片頭痛 -> 頭痛・片頭痛
```

## 6. データ投入の優先順位

### Phase 1: 基本データ
1. 疾患カテゴリ（主要カテゴリのみ）
2. 疾患状態（基本状態）
3. 主要疾患（うつ病、不安障害、てんかんなど）
4. 翻訳データ（日本語・英語）

### Phase 2: 拡張データ
1. サブカテゴリの追加
2. より多くの疾患データ
3. 詳細な翻訳データ

### Phase 3: 専門データ
1. 希少疾患
2. 専門的な状態分類
3. 地域固有の疾患

## 7. データ品質管理

### 検証項目
- ICD-10コードの正確性
- 重篤度レベルの適切性
- 翻訳の正確性
- カテゴリ分類の妥当性

### 更新フロー
1. 医療専門家によるレビュー
2. ユーザーフィードバックの反映
3. 定期的なデータ更新
4. バージョン管理
