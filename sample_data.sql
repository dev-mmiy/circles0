-- =====================================================
-- サンプルデータ投入スクリプト
-- =====================================================

-- 注意: このスクリプトは database_schema.sql 実行後に実行してください

-- =====================================================
-- サンプルユーザーデータ
-- =====================================================

-- サンプルユーザー1（うつ病）
INSERT INTO users (
    member_id, idp_id, idp_provider, first_name, last_name, email, 
    nickname, bio, preferred_language, is_verified
) VALUES (
    '2412000001', 'auth0|user001', 'auth0', '田中', '太郎', 'tanaka@example.com',
    'たなかさん', 'うつ病と向き合っています。同じ経験を持つ方と話したいです。', 'ja', true
);

-- サンプルユーザー2（不安障害）
INSERT INTO users (
    member_id, idp_id, idp_provider, first_name, last_name, email,
    nickname, bio, preferred_language, is_verified
) VALUES (
    '2412000002', 'auth0|user002', 'auth0', '佐藤', '花子', 'sato@example.com',
    'はなちゃん', '不安障害で悩んでいます。治療法や対処法を共有したいです。', 'ja', true
);

-- サンプルユーザー3（てんかん）
INSERT INTO users (
    member_id, idp_id, idp_provider, first_name, last_name, email,
    nickname, bio, preferred_language, is_verified
) VALUES (
    '2412000003', 'auth0|user003', 'auth0', '鈴木', '一郎', 'suzuki@example.com',
    'いちろう', 'てんかん持ちです。日常生活の工夫や体験談を共有したいです。', 'ja', true
);

-- サンプルユーザー4（英語ユーザー）
INSERT INTO users (
    member_id, idp_id, idp_provider, first_name, last_name, email,
    nickname, bio, preferred_language, is_verified
) VALUES (
    '2412000004', 'auth0|user004', 'auth0', 'John', 'Smith', 'john@example.com',
    'john_s', 'Living with depression. Looking to connect with others who understand.', 'en', true
);

-- =====================================================
-- サンプルユーザー疾患データ
-- =====================================================

-- ユーザー1の疾患（うつ病 - 活動期）
INSERT INTO user_diseases (
    user_id, disease_id, status_id, diagnosis_date, diagnosis_doctor, 
    diagnosis_hospital, severity_level, symptoms, limitations, medications,
    is_public, is_searchable
) VALUES (
    (SELECT id FROM users WHERE member_id = '2412000001'),
    1, -- うつ病
    1, -- 活動期
    '2023-01-15', '山田医師', '総合病院', 3,
    '気分の落ち込み、睡眠障害、食欲不振', '仕事の集中力低下', '抗うつ薬',
    true, true
);

-- ユーザー2の疾患（不安障害 - 治療中）
INSERT INTO user_diseases (
    user_id, disease_id, status_id, diagnosis_date, diagnosis_doctor,
    diagnosis_hospital, severity_level, symptoms, limitations, medications,
    is_public, is_searchable
) VALUES (
    (SELECT id FROM users WHERE member_id = '2412000002'),
    2, -- 不安障害
    5, -- 治療中
    '2023-03-20', '田中医師', '心療内科クリニック', 2,
    '過度な心配、パニック発作', '人混みが苦手', '抗不安薬',
    true, true
);

-- ユーザー3の疾患（てんかん - 慢性期）
INSERT INTO user_diseases (
    user_id, disease_id, status_id, diagnosis_date, diagnosis_doctor,
    diagnosis_hospital, severity_level, symptoms, limitations, medications,
    is_public, is_searchable
) VALUES (
    (SELECT id FROM users WHERE member_id = '2412000003'),
    3, -- てんかん
    4, -- 慢性期
    '2022-06-10', '佐藤医師', '神経内科', 4,
    'けいれん発作、意識障害', '運転不可、一人での外出制限', '抗てんかん薬',
    true, true
);

-- ユーザー4の疾患（うつ病 - 寛解期）
INSERT INTO user_diseases (
    user_id, disease_id, status_id, diagnosis_date, diagnosis_doctor,
    diagnosis_hospital, severity_level, symptoms, limitations, medications,
    is_public, is_searchable
) VALUES (
    (SELECT id FROM users WHERE member_id = '2412000004'),
    1, -- うつ病
    2, -- 寛解期
    '2022-11-05', 'Dr. Johnson', 'Mental Health Clinic', 2,
    'Occasional mood swings, sleep issues', 'Reduced work capacity', 'Antidepressants',
    true, true
);

-- =====================================================
-- 追加の疾患データ
-- =====================================================

-- 双極性障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F31.9', 'Bipolar disorder', 4);

INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(6, 'ja', '双極性障害', '気分が高揚する躁状態と落ち込むうつ状態を繰り返す疾患'),
(6, 'en', 'Bipolar Disorder', 'A disorder characterized by alternating manic and depressive episodes');

-- パニック障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F41.0', 'Panic disorder', 3);

INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(7, 'ja', 'パニック障害', '突然の激しい不安発作を特徴とする疾患'),
(7, 'en', 'Panic Disorder', 'A disorder characterized by sudden, intense anxiety attacks');

-- 強迫性障害
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F42.9', 'Obsessive-compulsive disorder', 3);

INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(8, 'ja', '強迫性障害', '強迫観念と強迫行為を特徴とする疾患'),
(8, 'en', 'Obsessive-Compulsive Disorder', 'A disorder characterized by obsessions and compulsions');

-- 疾患-カテゴリ関連の追加
INSERT INTO disease_category_mappings (disease_id, category_id) VALUES 
(6, 5), -- 双極性障害 -> 気分障害
(7, 6), -- パニック障害 -> 不安障害
(8, 1); -- 強迫性障害 -> 精神疾患

-- =====================================================
-- 検証用クエリ
-- =====================================================

-- ユーザー一覧（日本語）
SELECT 
    u.member_id,
    u.nickname,
    u.bio,
    dt.translated_name as disease_name,
    dst.translated_name as status_name,
    ud.diagnosis_date,
    ud.severity_level
FROM users u
JOIN user_diseases ud ON u.id = ud.user_id
JOIN diseases d ON ud.disease_id = d.id
JOIN disease_translations dt ON d.id = dt.disease_id AND dt.language_code = u.preferred_language
LEFT JOIN disease_statuses ds ON ud.status_id = ds.id
LEFT JOIN disease_status_translations dst ON ds.id = dst.status_id AND dst.language_code = u.preferred_language
WHERE ud.is_public = true
ORDER BY u.created_at;

-- 疾患別ユーザー数
SELECT 
    dt.translated_name as disease_name,
    COUNT(*) as user_count
FROM diseases d
JOIN disease_translations dt ON d.id = dt.disease_id AND dt.language_code = 'ja'
JOIN user_diseases ud ON d.id = ud.disease_id
WHERE ud.is_public = true
GROUP BY d.id, dt.translated_name
ORDER BY user_count DESC;

-- カテゴリ別疾患数
SELECT 
    dct.translated_name as category_name,
    COUNT(DISTINCT dcm.disease_id) as disease_count
FROM disease_categories dc
JOIN disease_category_translations dct ON dc.id = dct.category_id AND dct.language_code = 'ja'
JOIN disease_category_mappings dcm ON dc.id = dcm.category_id
GROUP BY dc.id, dct.translated_name
ORDER BY disease_count DESC;

SELECT 'Sample data inserted successfully!' as message;
