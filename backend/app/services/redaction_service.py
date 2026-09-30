import cloudinary.uploader
from typing import List
from app.core.config import settings

class RedactionService:
    @staticmethod
    def update_selective_faces(public_id: str, bystander_coordinates: List[List[int]]) -> dict:
        """
        Updates the explicit face_coordinates attribute in Cloudinary.
        When e_pixelate_faces is requested in delivery URLs, Cloudinary evaluates
        strictly against this registry, pixelating only coordinates present in this list.
        
        bystander_coordinates: [[x, y, w, h], ...] in original image resolution.
        """
        # Ensure integer coordinates
        sanitized_coords = []
        for coord in bystander_coordinates:
            if len(coord) == 4:
                sanitized_coords.append([int(coord[0]), int(coord[1]), int(coord[2]), int(coord[3])])
        
        # Call Cloudinary's explicit API
        # face_coordinates expects [[x, y, w, h], ...] or string representation
        try:
            result = cloudinary.uploader.explicit(
                public_id,
                type="upload",
                face_coordinates=sanitized_coords
            )
            return {
                "success": True,
                "public_id": public_id,
                "applied_bystander_count": len(sanitized_coords),
                "faces": sanitized_coords,
                "raw": result
            }
        except Exception as e:
            # Fallback / graceful error capture
            return {
                "success": False,
                "public_id": public_id,
                "error": str(e)
            }
