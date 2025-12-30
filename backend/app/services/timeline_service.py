"""
Service for timeline integration.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import desc, or_, union_all
from sqlalchemy.orm import Session

from app.models.blood_glucose_record import BloodGlucoseRecord
from app.models.blood_pressure_record import BloodPressureRecord
from app.models.body_fat_record import BodyFatRecord
from app.models.heart_rate_record import HeartRateRecord
from app.models.meal_record import MealRecord
from app.models.post import Post
from app.models.spo2_record import SpO2Record
from app.models.temperature_record import TemperatureRecord
from app.models.weight_record import WeightRecord


class TimelineService:
    """Service for timeline-related operations."""

    @staticmethod
    def get_timeline(
        db: Session,
        current_user_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 20,
        filter_type: str = "all",
    ) -> List[dict]:
        """
        Get unified timeline of posts, vital records, and meal records.
        
        Args:
            db: Database session
            current_user_id: Current user ID (optional)
            skip: Number of items to skip
            limit: Maximum number of items to return
            filter_type: "all" for all items, "following" for followed users only
        
        Returns:
            List of timeline items with type information
        """
        from app.models.follow import Follow

        # Base visibility filter
        visibility_filter = or_(
            Post.visibility == "public",
            Post.visibility == "followers_only",
        )

        # Get followed user IDs if filter_type is "following"
        followed_user_ids = []
        if filter_type == "following" and current_user_id:
            followed_users = (
                db.query(Follow.following_id)
                .filter(Follow.follower_id == current_user_id)
                .all()
            )
            followed_user_ids = [user_id[0] for user_id in followed_users]

        # Query posts
        posts_query = (
            db.query(
                Post.id,
                Post.user_id,
                Post.created_at,
                Post.updated_at,
                Post.visibility,
            )
            .filter(Post.is_active == True)
            .filter(visibility_filter)
        )

        if filter_type == "following" and current_user_id:
            if not followed_user_ids:
                # No followed users, return empty
                return []
            posts_query = posts_query.filter(Post.user_id.in_(followed_user_ids))
        elif filter_type == "my_posts" and current_user_id:
            posts_query = posts_query.filter(Post.user_id == current_user_id)

        # Query vital records (all 7 types)
        vital_visibility_filter = or_(
            BloodPressureRecord.visibility == "public",
            BloodPressureRecord.visibility == "followers_only",
        )

        bp_query = (
            db.query(
                BloodPressureRecord.id,
                BloodPressureRecord.user_id,
                BloodPressureRecord.created_at,
                BloodPressureRecord.updated_at,
                BloodPressureRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        hr_query = (
            db.query(
                HeartRateRecord.id,
                HeartRateRecord.user_id,
                HeartRateRecord.created_at,
                HeartRateRecord.updated_at,
                HeartRateRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        temp_query = (
            db.query(
                TemperatureRecord.id,
                TemperatureRecord.user_id,
                TemperatureRecord.created_at,
                TemperatureRecord.updated_at,
                TemperatureRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        weight_query = (
            db.query(
                WeightRecord.id,
                WeightRecord.user_id,
                WeightRecord.created_at,
                WeightRecord.updated_at,
                WeightRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        bf_query = (
            db.query(
                BodyFatRecord.id,
                BodyFatRecord.user_id,
                BodyFatRecord.created_at,
                BodyFatRecord.updated_at,
                BodyFatRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        bg_query = (
            db.query(
                BloodGlucoseRecord.id,
                BloodGlucoseRecord.user_id,
                BloodGlucoseRecord.created_at,
                BloodGlucoseRecord.updated_at,
                BloodGlucoseRecord.visibility,
            )
            .filter(vital_visibility_filter)
        )

        spo2_query = (
            db.query(
                SpO2Record.id,
                SpO2Record.user_id,
                SpO2Record.created_at,
                SpO2Record.updated_at,
                SpO2Record.visibility,
            )
            .filter(vital_visibility_filter)
        )

        # Query meal records
        meal_visibility_filter = or_(
            MealRecord.visibility == "public",
            MealRecord.visibility == "followers_only",
        )

        meal_query = (
            db.query(
                MealRecord.id,
                MealRecord.user_id,
                MealRecord.created_at,
                MealRecord.updated_at,
                MealRecord.visibility,
            )
            .filter(meal_visibility_filter)
        )

        # Apply filter_type to vital and meal records
        if filter_type == "following" and current_user_id:
            if not followed_user_ids:
                return []
            bp_query = bp_query.filter(BloodPressureRecord.user_id.in_(followed_user_ids))
            hr_query = hr_query.filter(HeartRateRecord.user_id.in_(followed_user_ids))
            temp_query = temp_query.filter(TemperatureRecord.user_id.in_(followed_user_ids))
            weight_query = weight_query.filter(WeightRecord.user_id.in_(followed_user_ids))
            bf_query = bf_query.filter(BodyFatRecord.user_id.in_(followed_user_ids))
            bg_query = bg_query.filter(BloodGlucoseRecord.user_id.in_(followed_user_ids))
            spo2_query = spo2_query.filter(SpO2Record.user_id.in_(followed_user_ids))
            meal_query = meal_query.filter(MealRecord.user_id.in_(followed_user_ids))
        elif filter_type == "my_posts" and current_user_id:
            bp_query = bp_query.filter(BloodPressureRecord.user_id == current_user_id)
            hr_query = hr_query.filter(HeartRateRecord.user_id == current_user_id)
            temp_query = temp_query.filter(TemperatureRecord.user_id == current_user_id)
            weight_query = weight_query.filter(WeightRecord.user_id == current_user_id)
            bf_query = bf_query.filter(BodyFatRecord.user_id == current_user_id)
            bg_query = bg_query.filter(BloodGlucoseRecord.user_id == current_user_id)
            spo2_query = spo2_query.filter(SpO2Record.user_id == current_user_id)
            meal_query = meal_query.filter(MealRecord.user_id == current_user_id)

        # For now, we'll fetch all items and sort in Python
        # In production, you might want to use a UNION query with proper sorting
        all_items = []

        # Fetch posts
        posts = posts_query.all()
        for post in posts:
            all_items.append({
                "id": post.id,
                "user_id": post.user_id,
                "created_at": post.created_at,
                "updated_at": post.updated_at,
                "visibility": post.visibility,
                "item_type": "post",
            })

        # Fetch vital records
        bp_records = bp_query.all()
        for record in bp_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "blood_pressure_record",
            })

        hr_records = hr_query.all()
        for record in hr_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "heart_rate_record",
            })

        temp_records = temp_query.all()
        for record in temp_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "temperature_record",
            })

        weight_records = weight_query.all()
        for record in weight_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "weight_record",
            })

        bf_records = bf_query.all()
        for record in bf_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "body_fat_record",
            })

        bg_records = bg_query.all()
        for record in bg_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "blood_glucose_record",
            })

        spo2_records = spo2_query.all()
        for record in spo2_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "spo2_record",
            })

        # Fetch meal records
        meal_records = meal_query.all()
        for record in meal_records:
            all_items.append({
                "id": record.id,
                "user_id": record.user_id,
                "created_at": record.created_at,
                "updated_at": record.updated_at,
                "visibility": record.visibility,
                "item_type": "meal_record",
            })

        # Sort by created_at descending
        all_items.sort(key=lambda x: x["created_at"], reverse=True)

        # Apply pagination
        total = len(all_items)
        paginated_items = all_items[skip : skip + limit]

        # Now fetch full details for each item
        result_items = []
        for item in paginated_items:
            item_type = item["item_type"]
            item_id = item["id"]

            if item_type == "post":
                post = db.query(Post).filter(Post.id == item_id).first()
                if post:
                    # Convert post to timeline item format
                    result_items.append({
                        "id": post.id,
                        "user_id": post.user_id,
                        "created_at": post.created_at,
                        "updated_at": post.updated_at,
                        "visibility": post.visibility,
                        "item_type": "post",
                        "content": post.content,
                        # Add other post fields as needed
                    })
            elif item_type == "blood_pressure_record":
                record = db.query(BloodPressureRecord).filter(BloodPressureRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "blood_pressure_record",
                        "recorded_at": record.recorded_at,
                        "systolic": record.systolic,
                        "diastolic": record.diastolic,
                        "notes": record.notes,
                    })
            elif item_type == "heart_rate_record":
                record = db.query(HeartRateRecord).filter(HeartRateRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "heart_rate_record",
                        "recorded_at": record.recorded_at,
                        "bpm": record.bpm,
                        "notes": record.notes,
                    })
            elif item_type == "temperature_record":
                record = db.query(TemperatureRecord).filter(TemperatureRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "temperature_record",
                        "recorded_at": record.recorded_at,
                        "value": float(record.value),
                        "unit": record.unit,
                        "notes": record.notes,
                    })
            elif item_type == "weight_record":
                record = db.query(WeightRecord).filter(WeightRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "weight_record",
                        "recorded_at": record.recorded_at,
                        "value": float(record.value),
                        "unit": record.unit,
                        "notes": record.notes,
                    })
            elif item_type == "body_fat_record":
                record = db.query(BodyFatRecord).filter(BodyFatRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "body_fat_record",
                        "recorded_at": record.recorded_at,
                        "percentage": float(record.percentage),
                        "notes": record.notes,
                    })
            elif item_type == "blood_glucose_record":
                record = db.query(BloodGlucoseRecord).filter(BloodGlucoseRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "blood_glucose_record",
                        "recorded_at": record.recorded_at,
                        "value": record.value,
                        "timing": record.timing,
                        "notes": record.notes,
                    })
            elif item_type == "spo2_record":
                record = db.query(SpO2Record).filter(SpO2Record.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "spo2_record",
                        "recorded_at": record.recorded_at,
                        "percentage": record.percentage,
                        "notes": record.notes,
                    })
            elif item_type == "meal_record":
                record = db.query(MealRecord).filter(MealRecord.id == item_id).first()
                if record:
                    result_items.append({
                        "id": record.id,
                        "user_id": record.user_id,
                        "created_at": record.created_at,
                        "updated_at": record.updated_at,
                        "visibility": record.visibility,
                        "item_type": "meal_record",
                        "recorded_at": record.recorded_at,
                        "meal_type": record.meal_type,
                        "foods": record.foods,
                        "nutrition": record.nutrition,
                        "notes": record.notes,
                    })

        return {
            "items": result_items,
            "total": total,
            "skip": skip,
            "limit": limit,
        }

