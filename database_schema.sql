-- =====================================================
-- 疾患コミュニティサイト データベーススキーマ
-- =====================================================

-- データベース作成（必要に応じて）
-- CREATE DATABASE disease_community;

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. Users（ユーザー）テーブル
-- =====================================================
CREATE TABLE users (
    -- プライマリキー（GUID）
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- 12桁の会員ID（ユーザーに表示される）
    member_id VARCHAR(12) UNIQUE NOT NULL,
    
    -- IDP（Identity Provider）のユーザーID（将来の切り替えに対応）
    idp_id VARCHAR(255) UNIQUE NOT NULL,
    idp_provider VARCHAR(50) DEFAULT 'auth0', -- 'auth0', 'okta', 'azure_ad' など
    
    -- 基本情報（プライベート情報）
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    
    -- 公開情報
    nickname VARCHAR(50) UNIQUE NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(500),
    
    -- アカウント状態
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- 言語設定
    preferred_language VARCHAR(5) DEFAULT 'ja', -- 'ja', 'en', 'ko', 'zh' など
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Usersテーブルのインデックス
CREATE INDEX idx_users_member_id ON users(member_id);
CREATE INDEX idx_users_idp ON users(idp_id, idp_provider);
CREATE INDEX idx_users_nickname ON users(nickname);
CREATE INDEX idx_users_email ON users(email);

-- =====================================================
-- 2. Diseases（疾患）テーブル
-- =====================================================
CREATE TABLE diseases (
    -- プライマリキー（整数）
    id SERIAL PRIMARY KEY,
    
    -- 疾患コード（ICD-10など）
    disease_code VARCHAR(20) UNIQUE,
    
    -- 疾患名（英語、システム内部用）
    name VARCHAR(200) NOT NULL,
    
    -- 疾患の重篤度レベル
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5), -- 1:軽度, 5:重度
    
    -- 疾患の状態
    is_active BOOLEAN DEFAULT true,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Diseasesテーブルのインデックス
CREATE INDEX idx_diseases_code ON diseases(disease_code);
CREATE INDEX idx_diseases_active ON diseases(is_active);

-- =====================================================
-- 3. DiseaseTranslations（疾患翻訳）テーブル
-- =====================================================
CREATE TABLE disease_translations (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 外部キー
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    
    -- 言語コード
    language_code VARCHAR(5) NOT NULL, -- 'ja', 'en', 'ko', 'zh' など
    
    -- 翻訳された疾患名
    translated_name VARCHAR(200) NOT NULL,
    
    -- 疾患の詳細説明
    details TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(disease_id, language_code)
);

-- DiseaseTranslationsテーブルのインデックス
CREATE INDEX idx_disease_translations_disease_id ON disease_translations(disease_id);
CREATE INDEX idx_disease_translations_language ON disease_translations(language_code);

-- =====================================================
-- 4. DiseaseCategories（疾患カテゴリ）テーブル
-- =====================================================
CREATE TABLE disease_categories (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- カテゴリコード（システム内部用）
    category_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- 親カテゴリID（階層構造対応）
    parent_category_id INTEGER REFERENCES disease_categories(id),
    
    -- 表示順序
    display_order INTEGER DEFAULT 0,
    
    -- カテゴリの状態
    is_active BOOLEAN DEFAULT true,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DiseaseCategoriesテーブルのインデックス
CREATE INDEX idx_disease_categories_code ON disease_categories(category_code);
CREATE INDEX idx_disease_categories_parent ON disease_categories(parent_category_id);
CREATE INDEX idx_disease_categories_active ON disease_categories(is_active);

-- =====================================================
-- 5. DiseaseCategoryTranslations（疾患カテゴリ翻訳）テーブル
-- =====================================================
CREATE TABLE disease_category_translations (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 外部キー
    category_id INTEGER NOT NULL REFERENCES disease_categories(id) ON DELETE CASCADE,
    
    -- 言語コード
    language_code VARCHAR(5) NOT NULL,
    
    -- 翻訳されたカテゴリ名
    translated_name VARCHAR(100) NOT NULL,
    
    -- カテゴリの説明
    description TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(category_id, language_code)
);

-- DiseaseCategoryTranslationsテーブルのインデックス
CREATE INDEX idx_category_translations_category_id ON disease_category_translations(category_id);
CREATE INDEX idx_category_translations_language ON disease_category_translations(language_code);

-- =====================================================
-- 6. DiseaseCategoryMappings（疾患-カテゴリ関連）テーブル
-- =====================================================
CREATE TABLE disease_category_mappings (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 外部キー
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES disease_categories(id) ON DELETE CASCADE,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(disease_id, category_id)
);

-- DiseaseCategoryMappingsテーブルのインデックス
CREATE INDEX idx_disease_category_mappings_disease_id ON disease_category_mappings(disease_id);
CREATE INDEX idx_disease_category_mappings_category_id ON disease_category_mappings(category_id);

-- =====================================================
-- 7. DiseaseStatuses（疾患状態マスター）テーブル
-- =====================================================
CREATE TABLE disease_statuses (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 状態コード（システム内部用）
    status_code VARCHAR(50) UNIQUE NOT NULL,
    
    -- 表示順序
    display_order INTEGER DEFAULT 0,
    
    -- 状態の有効性
    is_active BOOLEAN DEFAULT true,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- DiseaseStatusesテーブルのインデックス
CREATE INDEX idx_disease_statuses_code ON disease_statuses(status_code);
CREATE INDEX idx_disease_statuses_active ON disease_statuses(is_active);

-- =====================================================
-- 8. DiseaseStatusTranslations（疾患状態翻訳）テーブル
-- =====================================================
CREATE TABLE disease_status_translations (
    -- プライマリキー
    id SERIAL PRIMARY KEY,
    
    -- 外部キー
    status_id INTEGER NOT NULL REFERENCES disease_statuses(id) ON DELETE CASCADE,
    
    -- 言語コード
    language_code VARCHAR(5) NOT NULL,
    
    -- 翻訳された状態名
    translated_name VARCHAR(100) NOT NULL,
    
    -- 状態の説明
    description TEXT,
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(status_id, language_code)
);

-- DiseaseStatusTranslationsテーブルのインデックス
CREATE INDEX idx_status_translations_status_id ON disease_status_translations(status_id);
CREATE INDEX idx_status_translations_language ON disease_status_translations(language_code);

-- =====================================================
-- 9. UserDiseases（ユーザー疾患）テーブル
-- =====================================================
CREATE TABLE user_diseases (
    -- プライマリキー（整数ID）
    id SERIAL PRIMARY KEY,
    
    -- 外部キー
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    disease_id INTEGER NOT NULL REFERENCES diseases(id) ON DELETE CASCADE,
    status_id INTEGER REFERENCES disease_statuses(id),
    
    -- 診断情報
    diagnosis_date DATE,
    diagnosis_doctor VARCHAR(200),
    diagnosis_hospital VARCHAR(200),
    
    -- 疾患の重篤度レベル
    severity_level INTEGER CHECK (severity_level BETWEEN 1 AND 5),
    
    -- 症状・制限情報
    symptoms TEXT,
    limitations TEXT,
    medications TEXT,
    course TEXT, -- 疾患の経過
    
    -- プライバシー設定
    is_public BOOLEAN DEFAULT false, -- 他のユーザーに公開するか
    is_searchable BOOLEAN DEFAULT true, -- 疾患で検索可能にするか
    
    -- タイムスタンプ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 制約
    UNIQUE(user_id, disease_id)
);

-- UserDiseasesテーブルのインデックス
CREATE INDEX idx_user_diseases_user_id ON user_diseases(user_id);
CREATE INDEX idx_user_diseases_disease_id ON user_diseases(disease_id);
CREATE INDEX idx_user_diseases_status_id ON user_diseases(status_id);
CREATE INDEX idx_user_diseases_public ON user_diseases(is_public);
CREATE INDEX idx_user_diseases_searchable ON user_diseases(is_searchable);

-- =====================================================
-- トリガー関数（updated_at自動更新）
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 各テーブルにupdated_atトリガーを設定
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_diseases_updated_at BEFORE UPDATE ON diseases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_translations_updated_at BEFORE UPDATE ON disease_translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_categories_updated_at BEFORE UPDATE ON disease_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_category_translations_updated_at BEFORE UPDATE ON disease_category_translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_statuses_updated_at BEFORE UPDATE ON disease_statuses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disease_status_translations_updated_at BEFORE UPDATE ON disease_status_translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_diseases_updated_at BEFORE UPDATE ON user_diseases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 初期データの投入
-- =====================================================

-- 疾患状態マスターデータ
INSERT INTO disease_statuses (status_code, display_order) VALUES 
('ACTIVE', 1),
('REMISSION', 2),
('CURED', 3),
('CHRONIC', 4),
('UNDER_TREATMENT', 5);

-- 疾患状態翻訳データ
INSERT INTO disease_status_translations (status_id, language_code, translated_name, description) VALUES 
(1, 'ja', '活動期', '症状が現れている状態'),
(1, 'en', 'Active', 'Symptoms are currently present'),
(2, 'ja', '寛解期', '症状が一時的に改善している状態'),
(2, 'en', 'Remission', 'Symptoms are temporarily improved'),
(3, 'ja', '治癒', '完全に回復した状態'),
(3, 'en', 'Cured', 'Fully recovered'),
(4, 'ja', '慢性期', '長期間にわたって症状が続く状態'),
(4, 'en', 'Chronic', 'Long-term persistent symptoms'),
(5, 'ja', '治療中', '現在治療を受けている状態'),
(5, 'en', 'Under Treatment', 'Currently receiving treatment');

-- 疾患カテゴリマスターデータ
INSERT INTO disease_categories (category_code, parent_category_id, display_order) VALUES 
('MENTAL_HEALTH', NULL, 1),
('NEUROLOGICAL', NULL, 2),
('CARDIOVASCULAR', NULL, 3),
('RESPIRATORY', NULL, 4),
('MOOD_DISORDERS', 1, 1),
('ANXIETY_DISORDERS', 1, 2),
('PERSONALITY_DISORDERS', 1, 3);

-- 疾患カテゴリ翻訳データ
INSERT INTO disease_category_translations (category_id, language_code, translated_name, description) VALUES 
(1, 'ja', '精神疾患', '精神的な健康に関する疾患'),
(1, 'en', 'Mental Health', 'Disorders related to mental health'),
(2, 'ja', '神経疾患', '神経系に関する疾患'),
(2, 'en', 'Neurological', 'Disorders of the nervous system'),
(3, 'ja', '循環器疾患', '心臓や血管に関する疾患'),
(3, 'en', 'Cardiovascular', 'Disorders of the heart and blood vessels'),
(4, 'ja', '呼吸器疾患', '肺や気道に関する疾患'),
(4, 'en', 'Respiratory', 'Disorders of the lungs and airways'),
(5, 'ja', '気分障害', 'うつ病や双極性障害などの気分に関する疾患'),
(5, 'en', 'Mood Disorders', 'Disorders affecting mood like depression and bipolar disorder'),
(6, 'ja', '不安障害', '過度な不安や恐怖を特徴とする疾患'),
(6, 'en', 'Anxiety Disorders', 'Disorders characterized by excessive anxiety and fear'),
(7, 'ja', 'パーソナリティ障害', '思考や行動のパターンに問題がある疾患'),
(7, 'en', 'Personality Disorders', 'Disorders affecting thinking and behavioral patterns');

-- サンプル疾患データ
INSERT INTO diseases (disease_code, name, severity_level) VALUES 
('F32.9', 'Depressive disorder', 3),
('F41.9', 'Anxiety disorder', 2),
('G40.9', 'Epilepsy', 4),
('I25.9', 'Ischemic heart disease', 4),
('J45.9', 'Asthma', 2);

-- 疾患翻訳データ
INSERT INTO disease_translations (disease_id, language_code, translated_name, details) VALUES 
(1, 'ja', 'うつ病', '気分の落ち込みが続く精神疾患。睡眠障害、食欲不振、集中力の低下などの症状が現れる'),
(1, 'en', 'Depression', 'A mood disorder causing persistent sadness. Symptoms include sleep disturbances, appetite changes, and concentration difficulties'),
(2, 'ja', '不安障害', '過度な不安や心配が続く疾患。パニック発作や恐怖症を伴うことがある'),
(2, 'en', 'Anxiety Disorder', 'A disorder characterized by excessive anxiety and worry. May include panic attacks and phobias'),
(3, 'ja', 'てんかん', '脳の異常な電気活動による発作性疾患。けいれんや意識障害を引き起こす'),
(3, 'en', 'Epilepsy', 'A neurological disorder with recurrent seizures caused by abnormal electrical activity in the brain'),
(4, 'ja', '虚血性心疾患', '心臓の血管が狭くなることで起こる疾患。心筋梗塞や狭心症を含む'),
(4, 'en', 'Ischemic Heart Disease', 'A condition where heart blood vessels narrow, including myocardial infarction and angina'),
(5, 'ja', '喘息', '気道が炎症を起こし、呼吸困難を引き起こす疾患'),
(5, 'en', 'Asthma', 'A respiratory condition where airways become inflamed, causing breathing difficulties');

-- 疾患-カテゴリ関連データ
INSERT INTO disease_category_mappings (disease_id, category_id) VALUES 
(1, 5), -- うつ病 -> 気分障害
(2, 6), -- 不安障害 -> 不安障害
(3, 2), -- てんかん -> 神経疾患
(4, 3), -- 虚血性心疾患 -> 循環器疾患
(5, 4); -- 喘息 -> 呼吸器疾患

-- =====================================================
-- 完了メッセージ
-- =====================================================
SELECT 'Database schema created successfully!' as message;
