"""
Seed script for final disease master data
Creates 11 disease categories with specific diseases under each
"""

import sys
import os
from pathlib import Path

# Add project root to Python path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from sqlalchemy.orm import Session
from app.database import engine, SessionLocal
from app.models.disease import Disease, DiseaseCategory, DiseaseStatus, DiseaseTranslation, DiseaseCategoryTranslation, DiseaseStatusTranslation, DiseaseCategoryMapping

def clear_existing_data(db: Session):
    """Clear existing disease data"""
    print("Clearing existing data...")
    db.query(DiseaseCategoryMapping).delete()
    db.query(DiseaseTranslation).delete()
    db.query(Disease).delete()
    db.query(DiseaseCategoryTranslation).delete()
    db.query(DiseaseCategory).delete()
    db.query(DiseaseStatusTranslation).delete()
    db.query(DiseaseStatus).delete()
    db.commit()
    print("Existing data cleared.")

def create_disease_statuses(db: Session):
    """Create disease status master data"""
    print("\nCreating disease statuses...")

    statuses = [
        {
            "status_code": "DIAGNOSED",
            "display_order": 1,
            "translations": [
                {"language_code": "en", "translated_name": "Diagnosed", "description": "Currently diagnosed with this disease"},
                {"language_code": "ja", "translated_name": "診断済み", "description": "現在この疾患と診断されている"}
            ]
        },
        {
            "status_code": "TREATMENT",
            "display_order": 2,
            "translations": [
                {"language_code": "en", "translated_name": "Under Treatment", "description": "Currently receiving treatment"},
                {"language_code": "ja", "translated_name": "治療中", "description": "現在治療を受けている"}
            ]
        },
        {
            "status_code": "MONITORING",
            "display_order": 3,
            "translations": [
                {"language_code": "en", "translated_name": "Monitoring", "description": "Under regular monitoring"},
                {"language_code": "ja", "translated_name": "経過観察中", "description": "定期的に経過を観察している"}
            ]
        },
        {
            "status_code": "RECOVERED",
            "display_order": 4,
            "translations": [
                {"language_code": "en", "translated_name": "Recovered", "description": "Recovered from this disease"},
                {"language_code": "ja", "translated_name": "回復済み", "description": "この疾患から回復した"}
            ]
        },
        {
            "status_code": "PAST",
            "display_order": 5,
            "translations": [
                {"language_code": "en", "translated_name": "Past Diagnosis", "description": "Previously diagnosed"},
                {"language_code": "ja", "translated_name": "過去の診断", "description": "過去に診断された"}
            ]
        }
    ]

    for status_data in statuses:
        translations = status_data.pop("translations")
        status = DiseaseStatus(**status_data)
        db.add(status)
        db.flush()

        for trans in translations:
            translation = DiseaseStatusTranslation(status_id=status.id, **trans)
            db.add(translation)

    db.commit()
    print(f"Created {len(statuses)} disease statuses")

def create_categories_and_diseases(db: Session):
    """Create disease categories and diseases"""
    print("\nCreating categories and diseases...")

    categories_data = [
        {
            "category_code": "CARDIOVASCULAR",
            "display_order": 1,
            "translations": [
                {"language_code": "en", "translated_name": "Heart and Blood Vessel Diseases"},
                {"language_code": "ja", "translated_name": "① 心臓・血管の病気"}
            ],
            "diseases": [
                {"name": "Myocardial Infarction / Angina", "disease_code": "I20-I25", "ja_name": "心筋梗塞・狭心症"},
                {"name": "Heart Failure", "disease_code": "I50", "ja_name": "心不全"},
                {"name": "Arrhythmia", "disease_code": "I47-I49", "ja_name": "不整脈"},
                {"name": "Stroke (Cerebral Infarction / Hemorrhage)", "disease_code": "I60-I64", "ja_name": "脳卒中（脳梗塞・脳出血）"}
            ]
        },
        {
            "category_code": "NEUROLOGICAL",
            "display_order": 2,
            "translations": [
                {"language_code": "en", "translated_name": "Brain and Nervous System Diseases"},
                {"language_code": "ja", "translated_name": "② 脳と神経の病気"}
            ],
            "diseases": [
                {"name": "Dementia (Alzheimer's Type, etc.)", "disease_code": "F00-F03, G30", "ja_name": "認知症（アルツハイマー型など）"},
                {"name": "Parkinson's Disease", "disease_code": "G20", "ja_name": "パーキンソン病"},
                {"name": "ALS (Amyotrophic Lateral Sclerosis)", "disease_code": "G12.2", "ja_name": "ALS（筋萎縮性側索硬化症）"},
                {"name": "Epilepsy", "disease_code": "G40", "ja_name": "てんかん"}
            ]
        },
        {
            "category_code": "RESPIRATORY",
            "display_order": 3,
            "translations": [
                {"language_code": "en", "translated_name": "Lung and Respiratory Diseases"},
                {"language_code": "ja", "translated_name": "③ 肺・呼吸の病気"}
            ],
            "diseases": [
                {"name": "Lung Cancer", "disease_code": "C34", "ja_name": "肺がん"},
                {"name": "COPD (Chronic Obstructive Pulmonary Disease)", "disease_code": "J44", "ja_name": "COPD（慢性閉塞性肺疾患）"},
                {"name": "Pneumonia", "disease_code": "J18", "ja_name": "肺炎"},
                {"name": "Pulmonary Fibrosis", "disease_code": "J84.1", "ja_name": "肺線維症"}
            ]
        },
        {
            "category_code": "DIGESTIVE",
            "display_order": 4,
            "translations": [
                {"language_code": "en", "translated_name": "Stomach, Intestine, Liver, and Pancreas Diseases"},
                {"language_code": "ja", "translated_name": "④ 胃・腸・肝臓・すい臓の病気"}
            ],
            "diseases": [
                {"name": "Gastric/Colorectal/Pancreatic/Liver Cancer", "disease_code": "C15-C26", "ja_name": "胃がん・大腸がん・膵がん・肝がん"},
                {"name": "Liver Cirrhosis", "disease_code": "K74", "ja_name": "肝硬変"},
                {"name": "Ulcerative Colitis / Crohn's Disease", "disease_code": "K50-K51", "ja_name": "潰瘍性大腸炎・クローン病"},
                {"name": "Hepatitis (Type B, C, etc.)", "disease_code": "B18", "ja_name": "肝炎（B型・C型など）"}
            ]
        },
        {
            "category_code": "RENAL",
            "display_order": 5,
            "translations": [
                {"language_code": "en", "translated_name": "Kidney and Urological Diseases"},
                {"language_code": "ja", "translated_name": "⑤ 腎臓・泌尿器の病気"}
            ],
            "diseases": [
                {"name": "Chronic Renal Failure (Dialysis Required)", "disease_code": "N18", "ja_name": "慢性腎不全（透析が必要）"},
                {"name": "Kidney Cancer / Prostate Cancer", "disease_code": "C61, C64", "ja_name": "腎がん・前立腺がん"},
                {"name": "Nephrotic Syndrome", "disease_code": "N04", "ja_name": "ネフローゼ症候群"}
            ]
        },
        {
            "category_code": "HEMATOLOGIC_IMMUNOLOGIC",
            "display_order": 6,
            "translations": [
                {"language_code": "en", "translated_name": "Blood and Immune Diseases"},
                {"language_code": "ja", "translated_name": "⑥ 血液や免疫の病気"}
            ],
            "diseases": [
                {"name": "Leukemia / Lymphoma", "disease_code": "C81-C96", "ja_name": "白血病・リンパ腫"},
                {"name": "SLE (Systemic Lupus Erythematosus)", "disease_code": "M32", "ja_name": "SLE（全身性エリテマトーデス）"},
                {"name": "Rheumatoid Arthritis", "disease_code": "M05-M06", "ja_name": "関節リウマチ"},
                {"name": "Primary Immunodeficiency", "disease_code": "D80-D84", "ja_name": "原発性免疫不全症"}
            ]
        },
        {
            "category_code": "METABOLIC_ENDOCRINE",
            "display_order": 7,
            "translations": [
                {"language_code": "en", "translated_name": "Metabolic and Endocrine Diseases"},
                {"language_code": "ja", "translated_name": "⑦ 代謝・内分泌の病気"}
            ],
            "diseases": [
                {"name": "Diabetes Mellitus", "disease_code": "E10-E14", "ja_name": "糖尿病"},
                {"name": "Thyroid Diseases", "disease_code": "E00-E07", "ja_name": "甲状腺の病気"},
                {"name": "Dyslipidemia (Hypercholesterolemia)", "disease_code": "E78", "ja_name": "脂質異常症（高コレステロール血症）"},
                {"name": "Obesity / Metabolic Syndrome", "disease_code": "E66", "ja_name": "肥満症・メタボリックシンドローム"}
            ]
        },
        {
            "category_code": "PSYCHIATRIC",
            "display_order": 8,
            "translations": [
                {"language_code": "en", "translated_name": "Mental and Psychological Diseases"},
                {"language_code": "ja", "translated_name": "⑧ 精神・こころの病気"}
            ],
            "diseases": [
                {"name": "Depression", "disease_code": "F32-F33", "ja_name": "うつ病"},
                {"name": "Schizophrenia", "disease_code": "F20", "ja_name": "統合失調症"},
                {"name": "Anxiety Disorders / Panic Disorder", "disease_code": "F40-F41", "ja_name": "不安症・パニック障害"},
                {"name": "Dementia (Related to Brain Disease)", "disease_code": "F00-F03", "ja_name": "認知症（脳の病気とも関連）"}
            ]
        },
        {
            "category_code": "CANCER",
            "display_order": 9,
            "translations": [
                {"language_code": "en", "translated_name": "Cancer (Malignant Tumors)"},
                {"language_code": "ja", "translated_name": "⑨ がん（悪性腫瘍）"}
            ],
            "diseases": [
                {"name": "Lung/Gastric/Colorectal Cancer", "disease_code": "C15-C26, C34", "ja_name": "肺がん・胃がん・大腸がん"},
                {"name": "Breast Cancer / Uterine Cancer", "disease_code": "C50-C58", "ja_name": "乳がん・子宮がん"},
                {"name": "Prostate Cancer / Liver Cancer", "disease_code": "C22, C61", "ja_name": "前立腺がん・肝がん"},
                {"name": "Leukemia and Blood Cancers", "disease_code": "C91-C95", "ja_name": "白血病など血液のがん"}
            ]
        },
        {
            "category_code": "INFECTIOUS",
            "display_order": 10,
            "translations": [
                {"language_code": "en", "translated_name": "Infectious Diseases"},
                {"language_code": "ja", "translated_name": "⑩ 感染症"}
            ],
            "diseases": [
                {"name": "Tuberculosis", "disease_code": "A15-A19", "ja_name": "結核"},
                {"name": "Viral Hepatitis", "disease_code": "B15-B19", "ja_name": "肝炎（ウイルス性）"},
                {"name": "HIV/AIDS", "disease_code": "B20-B24", "ja_name": "HIV/AIDS"},
                {"name": "COVID-19 (Severe)", "disease_code": "U07.1", "ja_name": "新型コロナウイルス感染症（重症型）"}
            ]
        },
        {
            "category_code": "CONGENITAL_GENETIC",
            "display_order": 11,
            "translations": [
                {"language_code": "en", "translated_name": "Congenital and Genetic Diseases"},
                {"language_code": "ja", "translated_name": "⑪ 生まれつき・遺伝の病気"}
            ],
            "diseases": [
                {"name": "Muscular Dystrophy", "disease_code": "G71.0", "ja_name": "筋ジストロフィー"},
                {"name": "Down Syndrome and Chromosomal Abnormalities", "disease_code": "Q90-Q99", "ja_name": "ダウン症など染色体異常"},
                {"name": "Congenital Heart Disease", "disease_code": "Q20-Q28", "ja_name": "先天性心疾患"},
                {"name": "Metabolic Disorders", "disease_code": "E70-E88", "ja_name": "代謝異常症"}
            ]
        }
    ]

    total_diseases = 0

    for cat_data in categories_data:
        # Create category
        translations = cat_data.pop("translations")
        diseases_data = cat_data.pop("diseases")

        category = DiseaseCategory(
            category_code=cat_data["category_code"],
            display_order=cat_data["display_order"]
        )
        db.add(category)
        db.flush()

        # Create category translations
        for trans in translations:
            cat_translation = DiseaseCategoryTranslation(
                category_id=category.id,
                **trans
            )
            db.add(cat_translation)

        print(f"\nCreated category: {translations[1]['translated_name']}")

        # Create diseases for this category
        for disease_data in diseases_data:
            ja_name = disease_data.pop("ja_name")

            disease = Disease(**disease_data)
            db.add(disease)
            db.flush()

            # Create disease-category mapping
            mapping = DiseaseCategoryMapping(
                disease_id=disease.id,
                category_id=category.id
            )
            db.add(mapping)

            # Create disease translations
            disease_translations = [
                DiseaseTranslation(
                    disease_id=disease.id,
                    language_code="en",
                    translated_name=disease.name
                ),
                DiseaseTranslation(
                    disease_id=disease.id,
                    language_code="ja",
                    translated_name=ja_name
                )
            ]

            for trans in disease_translations:
                db.add(trans)

            print(f"  - {ja_name}")
            total_diseases += 1

    db.commit()
    print(f"\nCreated {len(categories_data)} categories with {total_diseases} diseases")

def main():
    """Main function"""
    print("=" * 60)
    print("Disease Master Data Seeding Script")
    print("=" * 60)

    db = SessionLocal()

    try:
        # Clear existing data
        clear_existing_data(db)

        # Create disease statuses
        create_disease_statuses(db)

        # Create categories and diseases
        create_categories_and_diseases(db)

        print("\n" + "=" * 60)
        print("Seeding completed successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\nError occurred: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
