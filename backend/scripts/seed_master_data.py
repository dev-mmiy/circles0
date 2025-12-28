"""
Seed master data for disease community platform.

This script populates the database with initial master data:
- Disease Statuses
- Disease Status Translations
- Disease Categories
- Disease Category Translations
- Sample Diseases
- Disease Translations
- Disease Category Mappings
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from datetime import datetime

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
        # Check if already exists
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

    # Get statuses
    statuses = session.query(DiseaseStatus).all()
    status_map = {s.status_code: s.id for s in statuses}

    translations = [
        # ACTIVE
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
        # REMISSION
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
        # CURED
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
        # CHRONIC
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
        # UNDER_TREATMENT
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
        # Check if already exists
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
            print(
                f"  Added translation: {trans_data['translated_name']} ({trans_data['language_code']})"
            )

    session.commit()
    print("Disease status translations seeded successfully!")


def seed_disease_categories(session):
    """Seed disease category master data."""
    print("\nSeeding disease categories...")

    categories = [
        # Top level categories
        {
            "category_code": "MENTAL_HEALTH",
            "parent_category_id": None,
            "display_order": 1,
        },
        {
            "category_code": "NEUROLOGICAL",
            "parent_category_id": None,
            "display_order": 2,
        },
        {
            "category_code": "CARDIOVASCULAR",
            "parent_category_id": None,
            "display_order": 3,
        },
        {
            "category_code": "RESPIRATORY",
            "parent_category_id": None,
            "display_order": 4,
        },
    ]

    category_map = {}
    for cat_data in categories:
        # Check if already exists
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
            session.flush()  # Flush to get ID
            category_map[cat_data["category_code"]] = category.id
            print(f"  Added category: {cat_data['category_code']}")

    session.commit()

    # Sub-categories
    sub_categories = [
        {
            "category_code": "MOOD_DISORDERS",
            "parent_category_id": category_map["MENTAL_HEALTH"],
            "display_order": 1,
        },
        {
            "category_code": "ANXIETY_DISORDERS",
            "parent_category_id": category_map["MENTAL_HEALTH"],
            "display_order": 2,
        },
        {
            "category_code": "PERSONALITY_DISORDERS",
            "parent_category_id": category_map["MENTAL_HEALTH"],
            "display_order": 3,
        },
    ]

    for cat_data in sub_categories:
        # Check if already exists
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
            print(f"  Added sub-category: {cat_data['category_code']}")

    session.commit()
    print("Disease categories seeded successfully!")
    return category_map


def seed_disease_category_translations(session, category_map):
    """Seed disease category translations."""
    print("\nSeeding disease category translations...")

    translations = [
        # MENTAL_HEALTH
        {
            "category_id": category_map["MENTAL_HEALTH"],
            "language_code": "ja",
            "translated_name": "精神疾患",
            "description": "精神的な健康に関する疾患",
        },
        {
            "category_id": category_map["MENTAL_HEALTH"],
            "language_code": "en",
            "translated_name": "Mental Health",
            "description": "Disorders related to mental health",
        },
        # NEUROLOGICAL
        {
            "category_id": category_map["NEUROLOGICAL"],
            "language_code": "ja",
            "translated_name": "神経疾患",
            "description": "神経系に関する疾患",
        },
        {
            "category_id": category_map["NEUROLOGICAL"],
            "language_code": "en",
            "translated_name": "Neurological",
            "description": "Disorders of the nervous system",
        },
        # CARDIOVASCULAR
        {
            "category_id": category_map["CARDIOVASCULAR"],
            "language_code": "ja",
            "translated_name": "循環器疾患",
            "description": "心臓や血管に関する疾患",
        },
        {
            "category_id": category_map["CARDIOVASCULAR"],
            "language_code": "en",
            "translated_name": "Cardiovascular",
            "description": "Disorders of the heart and blood vessels",
        },
        # RESPIRATORY
        {
            "category_id": category_map["RESPIRATORY"],
            "language_code": "ja",
            "translated_name": "呼吸器疾患",
            "description": "肺や気道に関する疾患",
        },
        {
            "category_id": category_map["RESPIRATORY"],
            "language_code": "en",
            "translated_name": "Respiratory",
            "description": "Disorders of the lungs and airways",
        },
        # MOOD_DISORDERS
        {
            "category_id": category_map["MOOD_DISORDERS"],
            "language_code": "ja",
            "translated_name": "気分障害",
            "description": "うつ病や双極性障害などの気分に関する疾患",
        },
        {
            "category_id": category_map["MOOD_DISORDERS"],
            "language_code": "en",
            "translated_name": "Mood Disorders",
            "description": "Disorders affecting mood like depression and bipolar disorder",
        },
        # ANXIETY_DISORDERS
        {
            "category_id": category_map["ANXIETY_DISORDERS"],
            "language_code": "ja",
            "translated_name": "不安障害",
            "description": "過度な不安や恐怖を特徴とする疾患",
        },
        {
            "category_id": category_map["ANXIETY_DISORDERS"],
            "language_code": "en",
            "translated_name": "Anxiety Disorders",
            "description": "Disorders characterized by excessive anxiety and fear",
        },
        # PERSONALITY_DISORDERS
        {
            "category_id": category_map["PERSONALITY_DISORDERS"],
            "language_code": "ja",
            "translated_name": "パーソナリティ障害",
            "description": "思考や行動のパターンに問題がある疾患",
        },
        {
            "category_id": category_map["PERSONALITY_DISORDERS"],
            "language_code": "en",
            "translated_name": "Personality Disorders",
            "description": "Disorders affecting thinking and behavioral patterns",
        },
    ]

    for trans_data in translations:
        # Check if already exists
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
            print(
                f"  Added translation: {trans_data['translated_name']} ({trans_data['language_code']})"
            )

    session.commit()
    print("Disease category translations seeded successfully!")


def seed_diseases(session):
    """Seed sample disease data."""
    print("\nSeeding sample diseases...")

    diseases = [
        {
            "disease_code": "F32.9",
            "name": "Depressive disorder",
            "severity_level": 3,
        },
        {"disease_code": "F41.9", "name": "Anxiety disorder", "severity_level": 2},
        {"disease_code": "G40.9", "name": "Epilepsy", "severity_level": 4},
        {
            "disease_code": "I25.9",
            "name": "Ischemic heart disease",
            "severity_level": 4,
        },
        {"disease_code": "J45.9", "name": "Asthma", "severity_level": 2},
    ]

    disease_map = {}
    for disease_data in diseases:
        # Check if already exists
        existing = (
            session.query(Disease)
            .filter_by(disease_code=disease_data["disease_code"])
            .first()
        )
        if existing:
            disease_map[disease_data["disease_code"]] = existing.id
        else:
            disease = Disease(**disease_data)
            session.add(disease)
            session.flush()
            disease_map[disease_data["disease_code"]] = disease.id
            print(
                f"  Added disease: {disease_data['name']} ({disease_data['disease_code']})"
            )

    session.commit()
    print("Sample diseases seeded successfully!")
    return disease_map


def seed_disease_translations(session, disease_map):
    """Seed disease translations."""
    print("\nSeeding disease translations...")

    translations = [
        # Depressive disorder
        {
            "disease_id": disease_map["F32.9"],
            "language_code": "ja",
            "translated_name": "うつ病",
            "details": "気分の落ち込みが続く精神疾患。睡眠障害、食欲不振、集中力の低下などの症状が現れる",
        },
        {
            "disease_id": disease_map["F32.9"],
            "language_code": "en",
            "translated_name": "Depression",
            "details": "A mood disorder causing persistent sadness. Symptoms include sleep disturbances, appetite changes, and concentration difficulties",
        },
        # Anxiety disorder
        {
            "disease_id": disease_map["F41.9"],
            "language_code": "ja",
            "translated_name": "不安障害",
            "details": "過度な不安や心配が続く疾患。パニック発作や恐怖症を伴うことがある",
        },
        {
            "disease_id": disease_map["F41.9"],
            "language_code": "en",
            "translated_name": "Anxiety Disorder",
            "details": "A disorder characterized by excessive anxiety and worry. May include panic attacks and phobias",
        },
        # Epilepsy
        {
            "disease_id": disease_map["G40.9"],
            "language_code": "ja",
            "translated_name": "てんかん",
            "details": "脳の異常な電気活動による発作性疾患。けいれんや意識障害を引き起こす",
        },
        {
            "disease_id": disease_map["G40.9"],
            "language_code": "en",
            "translated_name": "Epilepsy",
            "details": "A neurological disorder with recurrent seizures caused by abnormal electrical activity in the brain",
        },
        # Ischemic heart disease
        {
            "disease_id": disease_map["I25.9"],
            "language_code": "ja",
            "translated_name": "虚血性心疾患",
            "details": "心臓の血管が狭くなることで起こる疾患。心筋梗塞や狭心症を含む",
        },
        {
            "disease_id": disease_map["I25.9"],
            "language_code": "en",
            "translated_name": "Ischemic Heart Disease",
            "details": "A condition where heart blood vessels narrow, including myocardial infarction and angina",
        },
        # Asthma
        {
            "disease_id": disease_map["J45.9"],
            "language_code": "ja",
            "translated_name": "喘息",
            "details": "気道が炎症を起こし、呼吸困難を引き起こす疾患",
        },
        {
            "disease_id": disease_map["J45.9"],
            "language_code": "en",
            "translated_name": "Asthma",
            "details": "A respiratory condition where airways become inflamed, causing breathing difficulties",
        },
    ]

    for trans_data in translations:
        # Check if already exists
        existing = (
            session.query(DiseaseTranslation)
            .filter_by(
                disease_id=trans_data["disease_id"],
                language_code=trans_data["language_code"],
            )
            .first()
        )
        if not existing:
            translation = DiseaseTranslation(**trans_data)
            session.add(translation)
            print(
                f"  Added translation: {trans_data['translated_name']} ({trans_data['language_code']})"
            )

    session.commit()
    print("Disease translations seeded successfully!")


def seed_disease_category_mappings(session, disease_map, category_map):
    """Seed disease-category mappings."""
    print("\nSeeding disease-category mappings...")

    mappings = [
        {
            "disease_id": disease_map["F32.9"],
            "category_id": category_map["MOOD_DISORDERS"],
        },
        {
            "disease_id": disease_map["F41.9"],
            "category_id": category_map["ANXIETY_DISORDERS"],
        },
        {
            "disease_id": disease_map["G40.9"],
            "category_id": category_map["NEUROLOGICAL"],
        },
        {
            "disease_id": disease_map["I25.9"],
            "category_id": category_map["CARDIOVASCULAR"],
        },
        {
            "disease_id": disease_map["J45.9"],
            "category_id": category_map["RESPIRATORY"],
        },
    ]

    for mapping_data in mappings:
        # Check if already exists
        existing = (
            session.query(DiseaseCategoryMapping)
            .filter_by(
                disease_id=mapping_data["disease_id"],
                category_id=mapping_data["category_id"],
            )
            .first()
        )
        if not existing:
            mapping = DiseaseCategoryMapping(**mapping_data)
            session.add(mapping)
            print(
                f"  Added mapping: disease {mapping_data['disease_id']} -> category {mapping_data['category_id']}"
            )

    session.commit()
    print("Disease-category mappings seeded successfully!")


def main():
    """Main function to seed all master data."""
    print("=" * 60)
    print("Starting master data seeding...")
    print("=" * 60)

    # Create engine and session
    engine = create_engine(settings.database_url)
    SessionLocal = sessionmaker(bind=engine)
    session = SessionLocal()

    try:
        # Seed in order of dependencies
        seed_disease_statuses(session)
        seed_disease_status_translations(session)
        category_map = seed_disease_categories(session)
        seed_disease_category_translations(session, category_map)
        disease_map = seed_diseases(session)
        seed_disease_translations(session, disease_map)
        seed_disease_category_mappings(session, disease_map, category_map)

        print("\n" + "=" * 60)
        print("✅ All master data seeded successfully!")
        print("=" * 60)

    except Exception as e:
        print(f"\n❌ Error seeding master data: {e}")
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
