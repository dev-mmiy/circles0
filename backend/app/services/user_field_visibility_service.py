"""
User field visibility service for managing field-level privacy settings.
"""

from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.user_field_visibility import UserFieldVisibility


class UserFieldVisibilityService:
    """Service for managing user field visibility settings."""

    # Default visibility for each field
    DEFAULT_FIELD_VISIBILITY: Dict[str, str] = {
        "email": "private",
        "phone": "private",
        "date_of_birth": "limited",
        "gender": "limited",
        "bio": "public",
        "avatar_url": "public",
        "country": "public",
        "language": "public",
        "username": "public",
        "online_status": "private",
    }

    @staticmethod
    def get_field_visibility(db: Session, user_id: UUID, field_name: str) -> str:
        """
        Get visibility setting for a specific field.

        Returns default visibility if not explicitly set.
        """
        visibility = (
            db.query(UserFieldVisibility)
            .filter(
                UserFieldVisibility.user_id == user_id,
                UserFieldVisibility.field_name == field_name,
            )
            .first()
        )

        if visibility:
            return visibility.visibility

        # Return default visibility for this field
        return UserFieldVisibilityService.DEFAULT_FIELD_VISIBILITY.get(
            field_name, "limited"
        )

    @staticmethod
    def set_field_visibility(
        db: Session, user_id: UUID, field_name: str, visibility: str
    ) -> UserFieldVisibility:
        """
        Set visibility for a specific field.

        Creates or updates the visibility setting.
        """
        # Validate visibility value
        valid_visibilities = ["public", "limited", "private", "same_disease_only"]
        if visibility not in valid_visibilities:
            raise ValueError(
                f"Invalid visibility value: {visibility}. Must be one of {valid_visibilities}"
            )

        # Validate field name
        if field_name not in UserFieldVisibilityService.DEFAULT_FIELD_VISIBILITY:
            raise ValueError(
                f"Invalid field name: {field_name}. Must be one of {list(UserFieldVisibilityService.DEFAULT_FIELD_VISIBILITY.keys())}"
            )

        # Get or create visibility setting
        visibility_setting = (
            db.query(UserFieldVisibility)
            .filter(
                UserFieldVisibility.user_id == user_id,
                UserFieldVisibility.field_name == field_name,
            )
            .first()
        )

        if visibility_setting:
            visibility_setting.visibility = visibility
        else:
            visibility_setting = UserFieldVisibility(
                user_id=user_id, field_name=field_name, visibility=visibility
            )
            db.add(visibility_setting)

        db.commit()
        db.refresh(visibility_setting)

        return visibility_setting

    @staticmethod
    def get_all_field_visibilities(db: Session, user_id: UUID) -> Dict[str, str]:
        """
        Get all field visibility settings for a user.

        Returns a dictionary mapping field names to visibility levels.
        Includes defaults for fields that haven't been explicitly set.
        """
        visibility_settings = (
            db.query(UserFieldVisibility)
            .filter(UserFieldVisibility.user_id == user_id)
            .all()
        )

        # Create dictionary with all fields and their visibility
        result = UserFieldVisibilityService.DEFAULT_FIELD_VISIBILITY.copy()

        # Override with user's explicit settings
        for setting in visibility_settings:
            result[setting.field_name] = setting.visibility

        return result

    @staticmethod
    def can_view_field(
        db: Session,
        field_owner_id: UUID,
        field_name: str,
        viewer_id: Optional[UUID] = None,
        viewer_disease_ids: Optional[List[int]] = None,
    ) -> bool:
        """
        Check if a viewer can see a specific field based on privacy settings.
        
        This method implements the field-level visibility logic with the following rules:
        1. "public": Visible to everyone (including unauthenticated users)
        2. "private": Not visible to anyone (including the owner in public API responses)
           Note: The owner can see their own fields in the profile page, but not in public API responses
        3. "limited": Only visible to authenticated users
        4. "same_disease_only": Only visible to authenticated users who share at least one disease
           with the field owner (both must have the disease marked as public and active)
        
        Business Logic:
        - Private fields are strictly enforced: even the owner cannot see them in public API responses
          (e.g., feed, search results). This ensures true privacy.
        - Same disease check requires:
          a) Viewer must be authenticated
          b) Owner must have at least one public, active disease
          c) Viewer must have at least one active disease that matches owner's public diseases

        Args:
            db: Database session
            field_owner_id: ID of the user who owns the field
            field_name: Name of the field to check
            viewer_id: ID of the user viewing (None if unauthenticated)
            viewer_disease_ids: List of disease IDs the viewer has (for same_disease_only check).
                              If None, will be fetched from database.

        Returns:
            True if viewer can see the field, False otherwise
        """
        import logging
        logger = logging.getLogger(__name__)
        
        visibility = UserFieldVisibilityService.get_field_visibility(
            db, field_owner_id, field_name
        )

        logger.debug(
            f"[can_view_field] Field visibility check: "
            f"field_owner_id={field_owner_id}, field_name={field_name}, "
            f"viewer_id={viewer_id}, visibility={visibility}"
        )

        if visibility == "public":
            # Public fields are visible to everyone, including unauthenticated users
            return True
        elif visibility == "private":
            # Private fields are never visible to anyone (including the owner in API responses)
            # The owner can see their own fields in the profile page, but not in public API responses
            # This ensures true privacy: if a user sets a field to "private", it won't appear
            # in feed, search results, or any public-facing API responses
            logger.debug(
                f"[can_view_field] Field is private, returning False: "
                f"field_owner_id={field_owner_id}, field_name={field_name}, "
                f"viewer_id={viewer_id}"
            )
            return False
        elif visibility == "limited":
            # Limited fields are only visible to authenticated users
            # Unauthenticated users cannot see these fields
            return viewer_id is not None
        elif visibility == "same_disease_only":
            # Same disease only: Only users with matching diseases can see
            # This requires:
            # 1. Viewer must be authenticated
            # 2. Owner must have at least one public, active disease
            # 3. Viewer must have at least one active disease that matches owner's public diseases
            if viewer_id is None:
                return False

            # Get owner's public, active disease IDs
            # Note: We only consider diseases that are both active AND public
            # This ensures that private diseases don't affect visibility matching
            from app.models.disease import UserDisease

            owner_disease_ids = [
                ud.disease_id
                for ud in db.query(UserDisease)
                .filter(
                    UserDisease.user_id == field_owner_id,
                    UserDisease.is_active == True,
                    UserDisease.is_public == True,
                )
                .all()
            ]

            # If owner has no public diseases, no one can see the field
            if not owner_disease_ids:
                return False

            # Get viewer's active disease IDs (if not provided)
            # Note: For viewer, we check all active diseases (not just public ones)
            # because we want to match if viewer has the disease, regardless of their privacy setting
            if viewer_disease_ids is None:
                viewer_disease_ids = [
                    ud.disease_id
                    for ud in db.query(UserDisease)
                    .filter(
                        UserDisease.user_id == viewer_id,
                        UserDisease.is_active == True,
                    )
                    .all()
                ]

            # Check if there's any overlap between owner's public diseases and viewer's diseases
            # Using set intersection for efficient matching
            return bool(set(owner_disease_ids) & set(viewer_disease_ids))

        return False


