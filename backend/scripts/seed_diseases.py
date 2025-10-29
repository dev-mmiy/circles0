"""
Seed script to add sample diseases to the database for testing.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.disease import Disease


def seed_diseases():
    """Add sample diseases to the database."""
    db = SessionLocal()
    
    try:
        # Check if diseases already exist
        existing_count = db.query(Disease).count()
        if existing_count > 0:
            print(f"Database already has {existing_count} diseases. Skipping seed.")
            return
        
        # Sample diseases (Japanese and English names)
        diseases = [
            {"name": "糖尿病 (Diabetes)", "description": "血糖値の調節が困難になる慢性疾患", "category": "代謝疾患"},
            {"name": "高血圧 (Hypertension)", "description": "血圧が持続的に高い状態", "category": "循環器疾患"},
            {"name": "喘息 (Asthma)", "description": "気道の慢性的な炎症性疾患", "category": "呼吸器疾患"},
            {"name": "関節リウマチ (Rheumatoid Arthritis)", "description": "関節の慢性炎症性疾患", "category": "自己免疫疾患"},
            {"name": "クローン病 (Crohn's Disease)", "description": "消化管の慢性炎症性疾患", "category": "消化器疾患"},
            {"name": "潰瘍性大腸炎 (Ulcerative Colitis)", "description": "大腸の慢性炎症性疾患", "category": "消化器疾患"},
            {"name": "多発性硬化症 (Multiple Sclerosis)", "description": "中枢神経系の自己免疫疾患", "category": "神経疾患"},
            {"name": "パーキンソン病 (Parkinson's Disease)", "description": "運動機能に影響する神経変性疾患", "category": "神経疾患"},
            {"name": "アルツハイマー病 (Alzheimer's Disease)", "description": "認知機能が徐々に低下する疾患", "category": "神経疾患"},
            {"name": "がん (Cancer)", "description": "異常細胞の増殖による疾患", "category": "腫瘍"},
            {"name": "うつ病 (Depression)", "description": "持続的な抑うつ気分を特徴とする精神疾患", "category": "精神疾患"},
            {"name": "不安障害 (Anxiety Disorder)", "description": "過度な不安や恐怖を特徴とする疾患", "category": "精神疾患"},
            {"name": "心筋梗塞 (Myocardial Infarction)", "description": "心臓の血流が遮断される状態", "category": "循環器疾患"},
            {"name": "脳卒中 (Stroke)", "description": "脳への血流が遮断される状態", "category": "循環器疾患"},
            {"name": "慢性腎臓病 (Chronic Kidney Disease)", "description": "腎機能が徐々に低下する疾患", "category": "腎臓疾患"},
            {"name": "甲状腺機能低下症 (Hypothyroidism)", "description": "甲状腺ホルモンの分泌が不足する状態", "category": "内分泌疾患"},
            {"name": "甲状腺機能亢進症 (Hyperthyroidism)", "description": "甲状腺ホルモンが過剰に分泌される状態", "category": "内分泌疾患"},
            {"name": "アトピー性皮膚炎 (Atopic Dermatitis)", "description": "慢性的な皮膚の炎症性疾患", "category": "皮膚疾患"},
            {"name": "乾癬 (Psoriasis)", "description": "皮膚細胞の過剰な増殖による疾患", "category": "皮膚疾患"},
            {"name": "線維筋痛症 (Fibromyalgia)", "description": "全身の慢性的な痛みを特徴とする疾患", "category": "リウマチ性疾患"},
        ]
        
        # Add diseases to database
        for disease_data in diseases:
            disease = Disease(**disease_data)
            db.add(disease)
        
        db.commit()
        print(f"Successfully added {len(diseases)} diseases to the database.")
        
    except Exception as e:
        print(f"Error seeding diseases: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_diseases()

