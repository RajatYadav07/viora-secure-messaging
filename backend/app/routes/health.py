from fastapi import APIRouter

router = APIRouter(tags=["Health"])


@router.get("/health")
def health_check():
    """Basic health check endpoint returning system status."""
    return {"status": "ok"}
