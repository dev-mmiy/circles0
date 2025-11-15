"""
Storage service for handling file uploads to Google Cloud Storage.
"""

import os
import logging
from io import BytesIO
from typing import Optional, Tuple
from uuid import uuid4

try:
    from google.cloud import storage
    from google.cloud.exceptions import GoogleCloudError
    from PIL import Image
    GCS_AVAILABLE = True
except ImportError:
    GCS_AVAILABLE = False
    storage = None
    GoogleCloudError = Exception
    Image = None

logger = logging.getLogger(__name__)


class StorageService:
    """Service for handling file uploads to Google Cloud Storage."""

    def __init__(self):
        """Initialize the storage service."""
        if not GCS_AVAILABLE:
            logger.warning(
                "Google Cloud Storage libraries not available. "
                "Install google-cloud-storage and Pillow to enable image uploads."
            )
            self.client = None
            self.bucket_name = None
            return

        # Get configuration from environment variables
        self.bucket_name = os.getenv("GCS_BUCKET_NAME")
        self.project_id = os.getenv("GCS_PROJECT_ID")
        
        # Initialize GCS client
        if self.bucket_name:
            try:
                self.client = storage.Client(project=self.project_id)
                self.bucket = self.client.bucket(self.bucket_name)
                logger.info(f"GCS Storage service initialized with bucket: {self.bucket_name}")
            except Exception as e:
                logger.error(f"Failed to initialize GCS client: {e}")
                self.client = None
                self.bucket = None
        else:
            logger.warning("GCS_BUCKET_NAME not set. Image uploads will be disabled.")
            self.client = None
            self.bucket = None

    def is_available(self) -> bool:
        """Check if storage service is available."""
        return GCS_AVAILABLE and self.client is not None and self.bucket is not None

    def _resize_image(
        self, image_data: bytes, max_width: int = 1920, max_height: int = 1920, quality: int = 85
    ) -> bytes:
        """
        Resize and optimize image.
        
        Args:
            image_data: Original image bytes
            max_width: Maximum width in pixels
            max_height: Maximum height in pixels
            quality: JPEG quality (1-100)
            
        Returns:
            Resized image bytes
        """
        if not Image:
            return image_data

        try:
            # Open image
            img = Image.open(BytesIO(image_data))
            
            # Convert RGBA to RGB if necessary (for JPEG)
            if img.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Calculate new size maintaining aspect ratio
            width, height = img.size
            if width > max_width or height > max_height:
                ratio = min(max_width / width, max_height / height)
                new_width = int(width * ratio)
                new_height = int(height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
            
            # Save to bytes
            output = BytesIO()
            img.save(output, format='JPEG', quality=quality, optimize=True)
            return output.getvalue()
        except Exception as e:
            logger.error(f"Failed to resize image: {e}")
            return image_data

    def upload_image(
        self,
        image_data: bytes,
        content_type: str = "image/jpeg",
        folder: str = "posts",
        resize: bool = True,
        max_width: int = 1920,
        max_height: int = 1920,
    ) -> Optional[str]:
        """
        Upload an image to GCS.
        
        Args:
            image_data: Image file bytes
            content_type: MIME type of the image
            folder: Folder path in bucket (e.g., "posts", "avatars")
            resize: Whether to resize the image
            max_width: Maximum width for resizing
            max_height: Maximum height for resizing
            
        Returns:
            Public URL of the uploaded image, or None if upload failed
        """
        if not self.is_available():
            logger.error("Storage service is not available")
            return None

        try:
            # Resize image if requested
            if resize and Image:
                image_data = self._resize_image(image_data, max_width, max_height)
                content_type = "image/jpeg"  # Resized images are always JPEG

            # Generate unique filename
            file_extension = "jpg" if content_type.startswith("image/jpeg") else "png"
            filename = f"{folder}/{uuid4()}.{file_extension}"

            # Upload to GCS
            blob = self.bucket.blob(filename)
            blob.upload_from_string(
                image_data,
                content_type=content_type,
            )

            # Make blob publicly readable
            # Note: If uniform bucket-level access is enabled, make_public() will fail.
            # In that case, the bucket-level IAM policy should allow public access.
            try:
                blob.make_public()
            except GoogleCloudError as e:
                # If uniform bucket-level access is enabled, skip make_public()
                # The public URL will still work if bucket-level access is configured
                if "uniform bucket-level access" in str(e).lower():
                    logger.info("Uniform bucket-level access is enabled. Skipping make_public().")
                else:
                    raise

            # Get public URL
            public_url = blob.public_url

            logger.info(f"Image uploaded successfully: {public_url}")
            return public_url

        except GoogleCloudError as e:
            logger.error(f"GCS error uploading image: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error uploading image: {e}")
            return None

    def delete_image(self, image_url: str) -> bool:
        """
        Delete an image from GCS.
        
        Args:
            image_url: Public URL of the image to delete
            
        Returns:
            True if deletion was successful, False otherwise
        """
        if not self.is_available():
            logger.error("Storage service is not available")
            return False

        try:
            # Extract blob name from URL
            # URL format: https://storage.googleapis.com/bucket-name/path/to/file.jpg
            # or: https://bucket-name.storage.googleapis.com/path/to/file.jpg
            if "storage.googleapis.com" in image_url:
                parts = image_url.split("storage.googleapis.com/")
                if len(parts) == 2:
                    blob_path = parts[1].split("/", 1)[1] if "/" in parts[1] else parts[1]
                else:
                    logger.error(f"Invalid GCS URL format: {image_url}")
                    return False
            else:
                logger.error(f"URL does not appear to be a GCS URL: {image_url}")
                return False

            # Delete blob
            blob = self.bucket.blob(blob_path)
            blob.delete()

            logger.info(f"Image deleted successfully: {image_url}")
            return True

        except GoogleCloudError as e:
            logger.error(f"GCS error deleting image: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error deleting image: {e}")
            return False


# Global instance
storage_service = StorageService()

