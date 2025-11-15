"""
Image upload API endpoints for Google Cloud Storage.
"""

import logging
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import JSONResponse

from app.auth.dependencies import get_current_user
from app.services.storage_service import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/images", tags=["images"])

# Allowed image MIME types
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
}

# Maximum file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


@router.post(
    "/upload",
    summary="Upload an image to Google Cloud Storage",
    response_class=JSONResponse,
)
async def upload_image(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload an image file to Google Cloud Storage.
    
    Returns the public URL of the uploaded image.
    
    Requires authentication.
    """
    # Check if storage service is available
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload service is not configured. Please set GCS_BUCKET_NAME and GCS_PROJECT_ID environment variables.",
        )

    # Validate content type
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    # Read file content
    try:
        image_data = await file.read()
    except Exception as e:
        logger.error(f"Failed to read uploaded file: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to read uploaded file",
        )

    # Check file size
    if len(image_data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds maximum allowed size of {MAX_FILE_SIZE / 1024 / 1024}MB",
        )

    # Upload to GCS
    image_url = storage_service.upload_image(
        image_data=image_data,
        content_type=file.content_type or "image/jpeg",
        folder="posts",
        resize=True,
    )

    if not image_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload image to storage",
        )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "url": image_url,
            "message": "Image uploaded successfully",
        },
    )


@router.post(
    "/upload-multiple",
    summary="Upload multiple images to Google Cloud Storage",
    response_class=JSONResponse,
)
async def upload_multiple_images(
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload multiple image files to Google Cloud Storage.
    
    Returns a list of public URLs of the uploaded images.
    
    Maximum 5 images per request.
    
    Requires authentication.
    """
    # Check if storage service is available
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload service is not configured. Please set GCS_BUCKET_NAME and GCS_PROJECT_ID environment variables.",
        )

    # Validate number of files
    if len(files) > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 5 images allowed per request",
        )

    uploaded_urls = []
    errors = []

    for file in files:
        # Validate content type
        if file.content_type not in ALLOWED_CONTENT_TYPES:
            errors.append(f"{file.filename}: Invalid file type")
            continue

        # Read file content
        try:
            image_data = await file.read()
        except Exception as e:
            logger.error(f"Failed to read uploaded file {file.filename}: {e}")
            errors.append(f"{file.filename}: Failed to read file")
            continue

        # Check file size
        if len(image_data) > MAX_FILE_SIZE:
            errors.append(f"{file.filename}: File size exceeds maximum allowed size")
            continue

        # Upload to GCS
        image_url = storage_service.upload_image(
            image_data=image_data,
            content_type=file.content_type or "image/jpeg",
            folder="posts",
            resize=True,
        )

        if image_url:
            uploaded_urls.append(image_url)
        else:
            errors.append(f"{file.filename}: Failed to upload")

    if not uploaded_urls and errors:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload images: {', '.join(errors)}",
        )

    return JSONResponse(
        status_code=status.HTTP_201_CREATED,
        content={
            "urls": uploaded_urls,
            "errors": errors if errors else None,
            "message": f"Successfully uploaded {len(uploaded_urls)} image(s)",
        },
    )


@router.delete(
    "/delete",
    summary="Delete an image from Google Cloud Storage",
    response_class=JSONResponse,
)
async def delete_image(
    image_url: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Delete an image from Google Cloud Storage.
    
    Requires authentication.
    """
    # Check if storage service is available
    if not storage_service.is_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image upload service is not configured",
        )

    success = storage_service.delete_image(image_url)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete image",
        )

    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            "message": "Image deleted successfully",
        },
    )

