"""
Seed comprehensive master data for disease community platform.

This script populates the database with comprehensive Japanese medical disease data:
- 11 major disease categories
- 40+ specific diseases with ICD-10 codes
- Japanese and English translations
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.models import (
    Disease,
    DiseaseCategory,
    DiseaseCategoryMapping,
    DiseaseCategoryTranslation,
    DiseaseStatus,
    DiseaseStatusTranslation,
    DiseaseTranslation,
)


def seed_disease_statuses(session):
    """Seed disease status master data."""
    print("Seeding disease statuses...")

    statuses = [
        {"status_code": "ACTIVE", "display_order": 1},
        {"status_code": "REMISSION", "display_order": 2},
        {"status_code": "CURED", "display_order": 3},
        {"status_code": "CHRONIC", "display_order": 4},
        {"status_code": "UNDER_TREATMENT", "display_order": 5},
    ]

    for status_data in statuses:
        existing = (
            session.query(DiseaseStatus)
            .filter_by(status_code=status_data["status_code"])
            .first()
        )
        if not existing:
            status = DiseaseStatus(**status_data)
            session.add(status)
            print(f"  Added status: {status_data['status_code']}")

    session.commit()
    print("Disease statuses seeded successfully!")


def seed_disease_status_translations(session):
    """Seed disease status translations."""
    print("\nSeeding disease status translations...")

    statuses = session.query(DiseaseStatus).all()
    status_map = {s.status_code: s.id for s in statuses}

    translations = [
        {
            "status_id": status_map["ACTIVE"],
            "language_code": "ja",
            "translated_name": "活動期",
            "description": "症状が現れている状態",
        },
        {
            "status_id": status_map["ACTIVE"],
            "language_code": "en",
            "translated_name": "Active",
            "description": "Symptoms are currently present",
        },
        {
            "status_id": status_map["REMISSION"],
            "language_code": "ja",
            "translated_name": "寛解期",
            "description": "症状が一時的に改善している状態",
        },
        {
            "status_id": status_map["REMISSION"],
            "language_code": "en",
            "translated_name": "Remission",
            "description": "Symptoms are temporarily improved",
        },
        {
            "status_id": status_map["CURED"],
            "language_code": "ja",
            "translated_name": "治癒",
            "description": "完全に回復した状態",
        },
        {
            "status_id": status_map["CURED"],
            "language_code": "en",
            "translated_name": "Cured",
            "description": "Fully recovered",
        },
        {
            "status_id": status_map["CHRONIC"],
            "language_code": "ja",
            "translated_name": "慢性期",
            "description": "長期間にわたって症状が続く状態",
        },
        {
            "status_id": status_map["CHRONIC"],
            "language_code": "en",
            "translated_name": "Chronic",
            "description": "Long-term persistent symptoms",
        },
        {
            "status_id": status_map["UNDER_TREATMENT"],
            "language_code": "ja",
            "translated_name": "治療中",
            "description": "現在治療を受けている状態",
        },
        {
            "status_id": status_map["UNDER_TREATMENT"],
            "language_code": "en",
            "translated_name": "Under Treatment",
            "description": "Currently receiving treatment",
        },
    ]

    for trans_data in translations:
        existing = (
            session.query(DiseaseStatusTranslation)
            .filter_by(
                status_id=trans_data["status_id"],
                language_code=trans_data["language_code"],
            )
            .first()
        )
        if not existing:
            translation = DiseaseStatusTranslation(**trans_data)
            session.add(translation)

    session.commit()
    print("Disease status translations seeded successfully!")


def seed_disease_categories(session):
    """Seed comprehensive disease category master data."""
    print("\nSeeding disease categories...")

    # Main categories
    main_categories = [
        {"category_code": "CARDIOVASCULAR", "display_order": 1},
        {"category_code": "NEUROLOGICAL", "display_order": 2},
        {"category_code": "RESPIRATORY", "display_order": 3},
        {"category_code": "DIGESTIVE", "display_order": 4},
        {"category_code": "RENAL", "display_order": 5},
        {"category_code": "HEMATOLOGIC_IMMUNE", "display_order": 6},
        {"category_code": "METABOLIC_ENDOCRINE", "display_order": 7},
        {"category_code": "MENTAL_HEALTH", "display_order": 8},
        {"category_code": "CANCER", "display_order": 9},
        {"category_code": "INFECTIOUS", "display_order": 10},
        {"category_code": "CONGENITAL_GENETIC", "display_order": 11},
    ]

    category_map = {}
    for cat_data in main_categories:
        existing = (
            session.query(DiseaseCategory)
            .filter_by(category_code=cat_data["category_code"])
            .first()
        )
        if existing:
            category_map[cat_data["category_code"]] = existing.id
        else:
            category = DiseaseCategory(**cat_data)
            session.add(category)
            session.flush()
            category_map[cat_data["category_code"]] = category.id
            print(f"  Added category: {cat_data['category_code']}")

    session.commit()
    print("Disease categories seeded successfully!")
    return category_map


def seed_disease_category_translations(session, category_map):
    """Seed disease category translations."""
    print("\nSeeding disease category translations...")

    translations = [
        {
            "category_id": category_map["CARDIOVASCULAR"],
            "language_code": "ja",
            "translated_name": "心臓・血管の病気",
            "description": "心筋梗塞、心不全、不整脈、脳卒中など",
        },
        {
            "category_id": category_map["CARDIOVASCULAR"],
            "language_code": "en",
            "translated_name": "Heart and Vascular Diseases",
            "description": "Myocardial infarction, heart failure, arrhythmia, stroke, etc.",
        },
        {
            "category_id": category_map["NEUROLOGICAL"],
            "language_code": "ja",
            "translated_name": "脳と神経の病気",
            "description": "認知症、パーキンソン病、ALS、てんかんなど",
        },
        {
            "category_id": category_map["NEUROLOGICAL"],
            "language_code": "en",
            "translated_name": "Brain and Nervous System Diseases",
            "description": "Dementia, Parkinson's disease, ALS, epilepsy, etc.",
        },
        {
            "category_id": category_map["RESPIRATORY"],
            "language_code": "ja",
            "translated_name": "肺・呼吸の病気",
            "description": "肺がん、COPD、肺炎、肺線維症など",
        },
        {
            "category_id": category_map["RESPIRATORY"],
            "language_code": "en",
            "translated_name": "Lung and Respiratory Diseases",
            "description": "Lung cancer, COPD, pneumonia, pulmonary fibrosis, etc.",
        },
        {
            "category_id": category_map["DIGESTIVE"],
            "language_code": "ja",
            "translated_name": "胃・腸・肝臓・すい臓の病気",
            "description": "胃がん、大腸がん、肝硬変、潰瘍性大腸炎など",
        },
        {
            "category_id": category_map["DIGESTIVE"],
            "language_code": "en",
            "translated_name": "Digestive System Diseases",
            "description": "Gastric cancer, colorectal cancer, cirrhosis, ulcerative colitis, etc.",
        },
        {
            "category_id": category_map["RENAL"],
            "language_code": "ja",
            "translated_name": "腎臓・泌尿器の病気",
            "description": "慢性腎不全、腎がん、前立腺がん、ネフローゼ症候群など",
        },
        {
            "category_id": category_map["RENAL"],
            "language_code": "en",
            "translated_name": "Kidney and Urological Diseases",
            "description": "Chronic kidney disease, kidney cancer, prostate cancer, nephrotic syndrome, etc.",
        },
        {
            "category_id": category_map["HEMATOLOGIC_IMMUNE"],
            "language_code": "ja",
            "translated_name": "血液や免疫の病気",
            "description": "白血病、リンパ腫、SLE、関節リウマチなど",
        },
        {
            "category_id": category_map["HEMATOLOGIC_IMMUNE"],
            "language_code": "en",
            "translated_name": "Blood and Immune System Diseases",
            "description": "Leukemia, lymphoma, SLE, rheumatoid arthritis, etc.",
        },
        {
            "category_id": category_map["METABOLIC_ENDOCRINE"],
            "language_code": "ja",
            "translated_name": "代謝・内分泌の病気",
            "description": "糖尿病、甲状腺の病気、脂質異常症、肥満症など",
        },
        {
            "category_id": category_map["METABOLIC_ENDOCRINE"],
            "language_code": "en",
            "translated_name": "Metabolic and Endocrine Diseases",
            "description": "Diabetes, thyroid diseases, dyslipidemia, obesity, etc.",
        },
        {
            "category_id": category_map["MENTAL_HEALTH"],
            "language_code": "ja",
            "translated_name": "精神・こころの病気",
            "description": "うつ病、統合失調症、不安症、パニック障害など",
        },
        {
            "category_id": category_map["MENTAL_HEALTH"],
            "language_code": "en",
            "translated_name": "Mental Health Diseases",
            "description": "Depression, schizophrenia, anxiety disorders, panic disorder, etc.",
        },
        {
            "category_id": category_map["CANCER"],
            "language_code": "ja",
            "translated_name": "がん（悪性腫瘍）",
            "description": "肺がん、胃がん、大腸がん、乳がん、子宮がんなど",
        },
        {
            "category_id": category_map["CANCER"],
            "language_code": "en",
            "translated_name": "Cancer (Malignant Tumors)",
            "description": "Lung cancer, gastric cancer, colorectal cancer, breast cancer, uterine cancer, etc.",
        },
        {
            "category_id": category_map["INFECTIOUS"],
            "language_code": "ja",
            "translated_name": "感染症",
            "description": "結核、肝炎、HIV/AIDS、新型コロナウイルス感染症など",
        },
        {
            "category_id": category_map["INFECTIOUS"],
            "language_code": "en",
            "translated_name": "Infectious Diseases",
            "description": "Tuberculosis, hepatitis, HIV/AIDS, COVID-19, etc.",
        },
        {
            "category_id": category_map["CONGENITAL_GENETIC"],
            "language_code": "ja",
            "translated_name": "生まれつき・遺伝の病気",
            "description": "筋ジストロフィー、染色体異常、先天性心疾患、代謝異常症など",
        },
        {
            "category_id": category_map["CONGENITAL_GENETIC"],
            "language_code": "en",
            "translated_name": "Congenital and Genetic Diseases",
            "description": "Muscular dystrophy, chromosomal abnormalities, congenital heart disease, metabolic disorders, etc.",
        },
    ]

    for trans_data in translations:
        existing = (
            session.query(DiseaseCategoryTranslation)
            .filter_by(
                category_id=trans_data["category_id"],
                language_code=trans_data["language_code"],
            )
            .first()
        )
        if not existing:
            translation = DiseaseCategoryTranslation(**trans_data)
            session.add(translation)

    session.commit()
    print("Disease category translations seeded successfully!")


def seed_diseases(session):
    """Seed comprehensive disease data."""
    print("\nSeeding comprehensive diseases...")

    diseases = [
        # 心臓・血管の病気
        {"disease_code": "I21.9", "name": "Myocardial infarction", "severity_level": 5},
        {"disease_code": "I20.9", "name": "Angina pectoris", "severity_level": 4},
        {"disease_code": "I50.9", "name": "Heart failure", "severity_level": 5},
        {"disease_code": "I49.9", "name": "Cardiac arrhythmia", "severity_level": 3},
        {"disease_code": "I64", "name": "Stroke", "severity_level": 5},

        # 脳と神経の病気
        {"disease_code": "G30.9", "name": "Alzheimer's disease", "severity_level": 5},
        {"disease_code": "F00.9", "name": "Dementia", "severity_level": 5},
        {"disease_code": "G20", "name": "Parkinson's disease", "severity_level": 4},
        {"disease_code": "G12.2", "name": "ALS (Motor neurone disease)", "severity_level": 5},
        {"disease_code": "G40.9", "name": "Epilepsy", "severity_level": 3},

        # 肺・呼吸の病気
        {"disease_code": "C34.9", "name": "Lung cancer", "severity_level": 5},
        {"disease_code": "J44.9", "name": "COPD", "severity_level": 4},
        {"disease_code": "J18.9", "name": "Pneumonia", "severity_level": 3},
        {"disease_code": "J84.1", "name": "Pulmonary fibrosis", "severity_level": 4},
        {"disease_code": "J45.9", "name": "Asthma", "severity_level": 2},

        # 胃・腸・肝臓・すい臓の病気
        {"disease_code": "C16.9", "name": "Gastric cancer", "severity_level": 5},
        {"disease_code": "C18.9", "name": "Colorectal cancer", "severity_level": 5},
        {"disease_code": "C25.9", "name": "Pancreatic cancer", "severity_level": 5},
        {"disease_code": "C22.9", "name": "Liver cancer", "severity_level": 5},
        {"disease_code": "K74.6", "name": "Liver cirrhosis", "severity_level": 4},
        {"disease_code": "K51.9", "name": "Ulcerative colitis", "severity_level": 3},
        {"disease_code": "K50.9", "name": "Crohn's disease", "severity_level": 3},
        {"disease_code": "B18.1", "name": "Chronic hepatitis B", "severity_level": 3},
        {"disease_code": "B18.2", "name": "Chronic hepatitis C", "severity_level": 3},

        # 腎臓・泌尿器の病気
        {"disease_code": "N18.9", "name": "Chronic kidney disease", "severity_level": 4},
        {"disease_code": "C64.9", "name": "Kidney cancer", "severity_level": 5},
        {"disease_code": "C61", "name": "Prostate cancer", "severity_level": 4},
        {"disease_code": "N04.9", "name": "Nephrotic syndrome", "severity_level": 3},

        # 血液や免疫の病気
        {"disease_code": "C91.9", "name": "Leukemia", "severity_level": 5},
        {"disease_code": "C85.9", "name": "Lymphoma", "severity_level": 5},
        {"disease_code": "M32.9", "name": "Systemic lupus erythematosus", "severity_level": 4},
        {"disease_code": "M06.9", "name": "Rheumatoid arthritis", "severity_level": 3},
        {"disease_code": "D80.9", "name": "Primary immunodeficiency", "severity_level": 4},

        # 代謝・内分泌の病気
        {"disease_code": "E11.9", "name": "Type 2 diabetes mellitus", "severity_level": 3},
        {"disease_code": "E10.9", "name": "Type 1 diabetes mellitus", "severity_level": 3},
        {"disease_code": "E05.9", "name": "Hyperthyroidism", "severity_level": 2},
        {"disease_code": "E03.9", "name": "Hypothyroidism", "severity_level": 2},
        {"disease_code": "E78.5", "name": "Dyslipidemia", "severity_level": 2},
        {"disease_code": "E66.9", "name": "Obesity", "severity_level": 2},

        # 精神・こころの病気
        {"disease_code": "F32.9", "name": "Depressive disorder", "severity_level": 3},
        {"disease_code": "F20.9", "name": "Schizophrenia", "severity_level": 4},
        {"disease_code": "F41.9", "name": "Anxiety disorder", "severity_level": 2},
        {"disease_code": "F41.0", "name": "Panic disorder", "severity_level": 3},

        # がん（その他）
        {"disease_code": "C50.9", "name": "Breast cancer", "severity_level": 4},
        {"disease_code": "C53.9", "name": "Cervical cancer", "severity_level": 4},
        {"disease_code": "C54.1", "name": "Uterine cancer", "severity_level": 4},

        # 感染症
        {"disease_code": "A15.9", "name": "Tuberculosis", "severity_level": 3},
        {"disease_code": "B24", "name": "HIV/AIDS", "severity_level": 4},
        {"disease_code": "U07.1", "name": "COVID-19", "severity_level": 3},

        # 生まれつき・遺伝の病気
        {"disease_code": "G71.0", "name": "Muscular dystrophy", "severity_level": 4},
        {"disease_code": "Q90.9", "name": "Down syndrome", "severity_level": 3},
        {"disease_code": "Q24.9", "name": "Congenital heart disease", "severity_level": 4},
        {"disease_code": "E70.9", "name": "Metabolic disorder", "severity_level": 3},
    ]

    disease_map = {}
    for disease_data in diseases:
        existing = (
            session.query(Disease).filter_by(disease_code=disease_data["disease_code"]).first()
        )
        if existing:
            disease_map[disease_data["disease_code"]] = existing.id
        else:
            disease = Disease(**disease_data)
            session.add(disease)
            session.flush()
            disease_map[disease_data["disease_code"]] = disease.id
            print(f"  Added disease: {disease_data['name']} ({disease_data['disease_code']})")

    session.commit()
    print(f"Comprehensive diseases seeded successfully! Total: {len(diseases)} diseases")
    return disease_map


def seed_disease_translations(session, disease_map):
    """Seed disease translations."""
    print("\nSeeding disease translations...")

    translations = [
        # 心臓・血管の病気
        {"code": "I21.9", "ja": "心筋梗塞", "en": "Myocardial Infarction", "details_ja": "心臓の血管が詰まり心筋が壊死する重篤な疾患", "details_en": "Serious condition where heart muscle tissue dies due to blocked blood vessels"},
        {"code": "I20.9", "ja": "狭心症", "en": "Angina Pectoris", "details_ja": "心臓への血流が一時的に不足し胸痛が起こる", "details_en": "Chest pain caused by temporary reduction in blood flow to the heart"},
        {"code": "I50.9", "ja": "心不全", "en": "Heart Failure", "details_ja": "心臓のポンプ機能が低下し全身に十分な血液を送れない状態", "details_en": "Condition where the heart cannot pump enough blood to meet the body's needs"},
        {"code": "I49.9", "ja": "不整脈", "en": "Cardiac Arrhythmia", "details_ja": "心臓のリズムが乱れる状態", "details_en": "Irregular heart rhythm"},
        {"code": "I64", "ja": "脳卒中", "en": "Stroke", "details_ja": "脳梗塞や脳出血により脳の機能が障害される", "details_en": "Brain damage caused by cerebral infarction or hemorrhage"},

        # 脳と神経の病気
        {"code": "G30.9", "ja": "アルツハイマー病", "en": "Alzheimer's Disease", "details_ja": "進行性の認知症で記憶や思考能力が徐々に低下", "details_en": "Progressive dementia with gradual decline in memory and cognitive abilities"},
        {"code": "F00.9", "ja": "認知症", "en": "Dementia", "details_ja": "記憶力や判断力が低下し日常生活に支障をきたす", "details_en": "Decline in memory and judgment affecting daily life"},
        {"code": "G20", "ja": "パーキンソン病", "en": "Parkinson's Disease", "details_ja": "手足の震えや動作の遅さが特徴的な神経変性疾患", "details_en": "Neurodegenerative disease characterized by tremors and slow movement"},
        {"code": "G12.2", "ja": "ALS（筋萎縮性側索硬化症）", "en": "ALS (Motor Neurone Disease)", "details_ja": "運動神経が侵され筋力が低下していく難病", "details_en": "Progressive disease affecting motor neurons leading to muscle weakness"},
        {"code": "G40.9", "ja": "てんかん", "en": "Epilepsy", "details_ja": "脳の異常な電気活動により発作が起こる", "details_en": "Seizures caused by abnormal electrical activity in the brain"},

        # 肺・呼吸の病気
        {"code": "C34.9", "ja": "肺がん", "en": "Lung Cancer", "details_ja": "肺に発生する悪性腫瘍", "details_en": "Malignant tumor in the lungs"},
        {"code": "J44.9", "ja": "COPD（慢性閉塞性肺疾患）", "en": "COPD", "details_ja": "気道が慢性的に炎症を起こし呼吸困難となる", "details_en": "Chronic inflammation of airways causing breathing difficulties"},
        {"code": "J18.9", "ja": "肺炎", "en": "Pneumonia", "details_ja": "肺に炎症が起こり発熱や咳が出る", "details_en": "Lung inflammation with fever and cough"},
        {"code": "J84.1", "ja": "肺線維症", "en": "Pulmonary Fibrosis", "details_ja": "肺組織が硬くなり呼吸機能が低下する", "details_en": "Lung tissue becomes stiff, reducing respiratory function"},
        {"code": "J45.9", "ja": "喘息", "en": "Asthma", "details_ja": "気道が過敏になり発作的に呼吸困難が起こる", "details_en": "Hypersensitive airways causing episodic breathing difficulties"},

        # 胃・腸・肝臓・すい臓の病気
        {"code": "C16.9", "ja": "胃がん", "en": "Gastric Cancer", "details_ja": "胃に発生する悪性腫瘍", "details_en": "Malignant tumor in the stomach"},
        {"code": "C18.9", "ja": "大腸がん", "en": "Colorectal Cancer", "details_ja": "大腸に発生する悪性腫瘍", "details_en": "Malignant tumor in the colon or rectum"},
        {"code": "C25.9", "ja": "膵がん", "en": "Pancreatic Cancer", "details_ja": "すい臓に発生する悪性腫瘍", "details_en": "Malignant tumor in the pancreas"},
        {"code": "C22.9", "ja": "肝がん", "en": "Liver Cancer", "details_ja": "肝臓に発生する悪性腫瘍", "details_en": "Malignant tumor in the liver"},
        {"code": "K74.6", "ja": "肝硬変", "en": "Liver Cirrhosis", "details_ja": "肝臓が硬く変化し機能が低下する", "details_en": "Liver becomes hard and loses function"},
        {"code": "K51.9", "ja": "潰瘍性大腸炎", "en": "Ulcerative Colitis", "details_ja": "大腸の粘膜に潰瘍ができる慢性疾患", "details_en": "Chronic disease with ulcers in the colon lining"},
        {"code": "K50.9", "ja": "クローン病", "en": "Crohn's Disease", "details_ja": "消化管全体に炎症が起こる慢性疾患", "details_en": "Chronic inflammation throughout the digestive tract"},
        {"code": "B18.1", "ja": "B型肝炎", "en": "Chronic Hepatitis B", "details_ja": "B型肝炎ウイルスによる慢性肝炎", "details_en": "Chronic liver inflammation caused by hepatitis B virus"},
        {"code": "B18.2", "ja": "C型肝炎", "en": "Chronic Hepatitis C", "details_ja": "C型肝炎ウイルスによる慢性肝炎", "details_en": "Chronic liver inflammation caused by hepatitis C virus"},

        # 腎臓・泌尿器の病気
        {"code": "N18.9", "ja": "慢性腎不全", "en": "Chronic Kidney Disease", "details_ja": "腎臓の機能が徐々に低下し透析が必要になることも", "details_en": "Progressive loss of kidney function, may require dialysis"},
        {"code": "C64.9", "ja": "腎がん", "en": "Kidney Cancer", "details_ja": "腎臓に発生する悪性腫瘍", "details_en": "Malignant tumor in the kidney"},
        {"code": "C61", "ja": "前立腺がん", "en": "Prostate Cancer", "details_ja": "前立腺に発生する悪性腫瘍", "details_en": "Malignant tumor in the prostate"},
        {"code": "N04.9", "ja": "ネフローゼ症候群", "en": "Nephrotic Syndrome", "details_ja": "腎臓から大量のタンパクが漏れ出る状態", "details_en": "Condition where kidneys leak large amounts of protein"},

        # 血液や免疫の病気
        {"code": "C91.9", "ja": "白血病", "en": "Leukemia", "details_ja": "血液のがんで異常な白血球が増える", "details_en": "Blood cancer with abnormal white blood cell proliferation"},
        {"code": "C85.9", "ja": "リンパ腫", "en": "Lymphoma", "details_ja": "リンパ系の悪性腫瘍", "details_en": "Malignant tumor of the lymphatic system"},
        {"code": "M32.9", "ja": "全身性エリテマトーデス（SLE）", "en": "Systemic Lupus Erythematosus", "details_ja": "全身の臓器に炎症が起こる自己免疫疾患", "details_en": "Autoimmune disease causing inflammation in multiple organs"},
        {"code": "M06.9", "ja": "関節リウマチ", "en": "Rheumatoid Arthritis", "details_ja": "関節に炎症が起こり痛みや変形が生じる", "details_en": "Joint inflammation causing pain and deformity"},
        {"code": "D80.9", "ja": "原発性免疫不全症", "en": "Primary Immunodeficiency", "details_ja": "生まれつき免疫機能が低下している", "details_en": "Congenital impairment of immune function"},

        # 代謝・内分泌の病気
        {"code": "E11.9", "ja": "2型糖尿病", "en": "Type 2 Diabetes Mellitus", "details_ja": "インスリンの働きが悪くなり血糖値が高くなる", "details_en": "High blood sugar due to impaired insulin function"},
        {"code": "E10.9", "ja": "1型糖尿病", "en": "Type 1 Diabetes Mellitus", "details_ja": "インスリンが分泌されず血糖値が高くなる", "details_en": "High blood sugar due to lack of insulin production"},
        {"code": "E05.9", "ja": "甲状腺機能亢進症", "en": "Hyperthyroidism", "details_ja": "甲状腺ホルモンが過剰に分泌される", "details_en": "Excessive thyroid hormone production"},
        {"code": "E03.9", "ja": "甲状腺機能低下症", "en": "Hypothyroidism", "details_ja": "甲状腺ホルモンの分泌が不足する", "details_en": "Insufficient thyroid hormone production"},
        {"code": "E78.5", "ja": "脂質異常症", "en": "Dyslipidemia", "details_ja": "血液中のコレステロールや中性脂肪が異常値を示す", "details_en": "Abnormal levels of cholesterol and triglycerides in blood"},
        {"code": "E66.9", "ja": "肥満症", "en": "Obesity", "details_ja": "体脂肪が過剰に蓄積した状態", "details_en": "Excessive accumulation of body fat"},

        # 精神・こころの病気
        {"code": "F32.9", "ja": "うつ病", "en": "Depressive Disorder", "details_ja": "気分の落ち込みが続き日常生活に支障をきたす", "details_en": "Persistent low mood affecting daily life"},
        {"code": "F20.9", "ja": "統合失調症", "en": "Schizophrenia", "details_ja": "幻覚や妄想が現れる精神疾患", "details_en": "Mental disorder with hallucinations and delusions"},
        {"code": "F41.9", "ja": "不安症", "en": "Anxiety Disorder", "details_ja": "過度な不安や心配が続く状態", "details_en": "Persistent excessive anxiety and worry"},
        {"code": "F41.0", "ja": "パニック障害", "en": "Panic Disorder", "details_ja": "突然の強い不安と身体症状が起こる", "details_en": "Sudden intense anxiety with physical symptoms"},

        # がん（その他）
        {"code": "C50.9", "ja": "乳がん", "en": "Breast Cancer", "details_ja": "乳房に発生する悪性腫瘍", "details_en": "Malignant tumor in the breast"},
        {"code": "C53.9", "ja": "子宮頸がん", "en": "Cervical Cancer", "details_ja": "子宮頸部に発生する悪性腫瘍", "details_en": "Malignant tumor in the cervix"},
        {"code": "C54.1", "ja": "子宮体がん", "en": "Uterine Cancer", "details_ja": "子宮体部に発生する悪性腫瘍", "details_en": "Malignant tumor in the uterine body"},

        # 感染症
        {"code": "A15.9", "ja": "結核", "en": "Tuberculosis", "details_ja": "結核菌による感染症で主に肺が侵される", "details_en": "Bacterial infection primarily affecting the lungs"},
        {"code": "B24", "ja": "HIV/AIDS", "en": "HIV/AIDS", "details_ja": "免疫機能が低下するウイルス感染症", "details_en": "Viral infection causing immune system deterioration"},
        {"code": "U07.1", "ja": "新型コロナウイルス感染症", "en": "COVID-19", "details_ja": "SARS-CoV-2ウイルスによる呼吸器感染症", "details_en": "Respiratory infection caused by SARS-CoV-2 virus"},

        # 生まれつき・遺伝の病気
        {"code": "G71.0", "ja": "筋ジストロフィー", "en": "Muscular Dystrophy", "details_ja": "筋肉が徐々に弱くなる遺伝性疾患", "details_en": "Genetic disease causing progressive muscle weakness"},
        {"code": "Q90.9", "ja": "ダウン症", "en": "Down Syndrome", "details_ja": "21番染色体が1本多い染色体異常症", "details_en": "Chromosomal disorder with an extra chromosome 21"},
        {"code": "Q24.9", "ja": "先天性心疾患", "en": "Congenital Heart Disease", "details_ja": "生まれつき心臓に構造的な異常がある", "details_en": "Structural heart abnormality present at birth"},
        {"code": "E70.9", "ja": "代謝異常症", "en": "Metabolic Disorder", "details_ja": "生まれつき代謝に異常がある疾患", "details_en": "Congenital disorder affecting metabolism"},
    ]

    count = 0
    for trans in translations:
        disease_id = disease_map.get(trans["code"])
        if disease_id:
            # Japanese
            existing_ja = (
                session.query(DiseaseTranslation)
                .filter_by(disease_id=disease_id, language_code="ja")
                .first()
            )
            if not existing_ja:
                trans_ja = DiseaseTranslation(
                    disease_id=disease_id,
                    language_code="ja",
                    translated_name=trans["ja"],
                    details=trans["details_ja"],
                )
                session.add(trans_ja)
                count += 1

            # English
            existing_en = (
                session.query(DiseaseTranslation)
                .filter_by(disease_id=disease_id, language_code="en")
                .first()
            )
            if not existing_en:
                trans_en = DiseaseTranslation(
                    disease_id=disease_id,
                    language_code="en",
                    translated_name=trans["en"],
                    details=trans["details_en"],
                )
                session.add(trans_en)
                count += 1

    session.commit()
    print(f"Disease translations seeded successfully! Added {count} translations")


def seed_disease_category_mappings(session, disease_map, category_map):
    """Seed disease-category mappings."""
    print("\nSeeding disease-category mappings...")

    mappings = [
        # 心臓・血管の病気
        ("I21.9", "CARDIOVASCULAR"), ("I20.9", "CARDIOVASCULAR"), ("I50.9", "CARDIOVASCULAR"),
        ("I49.9", "CARDIOVASCULAR"), ("I64", "CARDIOVASCULAR"),

        # 脳と神経の病気
        ("G30.9", "NEUROLOGICAL"), ("F00.9", "NEUROLOGICAL"), ("G20", "NEUROLOGICAL"),
        ("G12.2", "NEUROLOGICAL"), ("G40.9", "NEUROLOGICAL"),

        # 肺・呼吸の病気
        ("C34.9", "RESPIRATORY"), ("J44.9", "RESPIRATORY"), ("J18.9", "RESPIRATORY"),
        ("J84.1", "RESPIRATORY"), ("J45.9", "RESPIRATORY"),

        # 胃・腸・肝臓・すい臓の病気
        ("C16.9", "DIGESTIVE"), ("C18.9", "DIGESTIVE"), ("C25.9", "DIGESTIVE"),
        ("C22.9", "DIGESTIVE"), ("K74.6", "DIGESTIVE"), ("K51.9", "DIGESTIVE"),
        ("K50.9", "DIGESTIVE"), ("B18.1", "DIGESTIVE"), ("B18.2", "DIGESTIVE"),

        # 腎臓・泌尿器の病気
        ("N18.9", "RENAL"), ("C64.9", "RENAL"), ("C61", "RENAL"), ("N04.9", "RENAL"),

        # 血液や免疫の病気
        ("C91.9", "HEMATOLOGIC_IMMUNE"), ("C85.9", "HEMATOLOGIC_IMMUNE"),
        ("M32.9", "HEMATOLOGIC_IMMUNE"), ("M06.9", "HEMATOLOGIC_IMMUNE"),
        ("D80.9", "HEMATOLOGIC_IMMUNE"),

        # 代謝・内分泌の病気
        ("E11.9", "METABOLIC_ENDOCRINE"), ("E10.9", "METABOLIC_ENDOCRINE"),
        ("E05.9", "METABOLIC_ENDOCRINE"), ("E03.9", "METABOLIC_ENDOCRINE"),
        ("E78.5", "METABOLIC_ENDOCRINE"), ("E66.9", "METABOLIC_ENDOCRINE"),

        # 精神・こころの病気
        ("F32.9", "MENTAL_HEALTH"), ("F20.9", "MENTAL_HEALTH"),
        ("F41.9", "MENTAL_HEALTH"), ("F41.0", "MENTAL_HEALTH"),

        # がん（悪性腫瘍）
        ("C34.9", "CANCER"), ("C16.9", "CANCER"), ("C18.9", "CANCER"),
        ("C25.9", "CANCER"), ("C22.9", "CANCER"), ("C64.9", "CANCER"),
        ("C61", "CANCER"), ("C91.9", "CANCER"), ("C85.9", "CANCER"),
        ("C50.9", "CANCER"), ("C53.9", "CANCER"), ("C54.1", "CANCER"),

        # 感染症
        ("A15.9", "INFECTIOUS"), ("B24", "INFECTIOUS"), ("U07.1", "INFECTIOUS"),
        ("B18.1", "INFECTIOUS"), ("B18.2", "INFECTIOUS"),

        # 生まれつき・遺伝の病気
        ("G71.0", "CONGENITAL_GENETIC"), ("Q90.9", "CONGENITAL_GENETIC"),
        ("Q24.9", "CONGENITAL_GENETIC"), ("E70.9", "CONGENITAL_GENETIC"),
    ]

    count = 0
    for disease_code, category_code in mappings:
        disease_id = disease_map.get(disease_code)
        category_id = category_map.get(category_code)

        if disease_id and category_id:
            existing = (
                session.query(DiseaseCategoryMapping)
                .filter_by(disease_id=disease_id, category_id=category_id)
                .first()
            )
            if not existing:
                mapping = DiseaseCategoryMapping(
                    disease_id=disease_id,
                    category_id=category_id,
                )
                session.add(mapping)
                count += 1

    session.commit()
    print(f"Disease-category mappings seeded successfully! Added {count} mappings")


def main():
    """Main function to seed all comprehensive master data."""
    print("=" * 60)
    print("Starting comprehensive master data seeding...")
    print("=" * 60)

    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        seed_disease_statuses(session)
        seed_disease_status_translations(session)
        category_map = seed_disease_categories(session)
        seed_disease_category_translations(session, category_map)
        disease_map = seed_diseases(session)
        seed_disease_translations(session, disease_map)
        seed_disease_category_mappings(session, disease_map, category_map)

        print("\n" + "=" * 60)
        print("✅ All comprehensive master data seeded successfully!")
        print("=" * 60)
        print(f"\nSummary:")
        print(f"  - Categories: {len(category_map)}")
        print(f"  - Diseases: {len(disease_map)}")
        print(f"  - Statuses: 5")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error seeding master data: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
