import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

BACKEND_ROOT = Path(__file__).resolve().parents[2]
STATIC_DIR = BACKEND_ROOT / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"}
MAX_BYTES = 5 * 1024 * 1024


def ensure_upload_dirs() -> None:
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)


async def save_workspace_logo(upload: UploadFile) -> str:
    """Save image to static/uploads and return public path e.g. /static/uploads/abc.png."""
    ensure_upload_dirs()

    filename = upload.filename or ""
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    content = await upload.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty",
        )
    if len(content) > MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Image must be 5 MB or smaller",
        )

    safe_name = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOAD_DIR / safe_name
    dest.write_bytes(content)

    return f"/static/uploads/{safe_name}"
