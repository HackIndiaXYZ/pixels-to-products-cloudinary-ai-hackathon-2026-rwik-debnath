from typing import List, Optional
from cloudinary.search import Search
from app.services.intake_service import WIRE_STORE
from app.models.schemas import MediaAssetResponse

class SearchService:
    @staticmethod
    def query_assets(
        query_str: Optional[str] = None,
        incident_type: Optional[str] = None,
        review_status: Optional[str] = None,
        urgency: Optional[str] = None,
        is_archived: Optional[bool] = None,
        max_results: int = 30
    ) -> List[MediaAssetResponse]:
        """
        Executes Lucene query via Cloudinary Search API or filters WIRE_STORE.
        Example expression: 'folder:presswire/* AND tags:breaking AND -status:rejected'
        """
        results = list(WIRE_STORE.values())
        
        if is_archived is not None:
            results = [a for a in results if a.is_archived == is_archived]
        if review_status:
            results = [a for a in results if a.review_status.lower() == review_status.lower()]
        if incident_type:
            results = [a for a in results if a.incident_type.lower() == incident_type.lower()]
        if urgency:
            results = [a for a in results if a.urgency.lower() == urgency.lower()]
        if query_str:
            q_lower = query_str.lower()
            results = [
                a for a in results 
                if q_lower in a.public_id.lower() 
                or (a.headline and q_lower in a.headline.lower())
                or q_lower in a.incident_type.lower()
            ]

        try:
            search_query = Search().max_results(max_results).sort_by("created_at", "desc")
            expressions = ["folder:presswire*"]
            if incident_type:
                expressions.append(f"tags:{incident_type}")
            if urgency:
                expressions.append(f"tags:{urgency}")
            if query_str:
                expressions.append(query_str)
            
            search_query.expression(" AND ".join(expressions))
            cloud_res = search_query.execute()
        except Exception:
            pass

        return sorted(results, key=lambda x: x.created_at, reverse=True)[:max_results]
