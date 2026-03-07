"""
KubeAtlas tool definitions for OpenAI-compatible function calling.
Her tool bir KubeAtlas API endpoint'ine karşılık gelir.
"""
import json
import logging
from app.kubeatlas_client import kubeatlas

logger = logging.getLogger("tools")

# ============================================
# Tool Definitions (OpenAI function calling format)
# ============================================

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_stats",
            "description": "KubeAtlas dashboard istatistiklerini getir: toplam cluster, namespace, team, user sayıları ve ortam dağılımı",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_activities",
            "description": "Son aktiviteleri ve değişiklikleri getir. Kim, ne zaman, neyi değiştirmiş gösterir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Kaç aktivite getirilsin (varsayılan 10)",
                        "default": 10,
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_missing_info",
            "description": "Eksik bilgisi olan kaynakları getir: sahipsiz namespace'ler, açıklaması olmayan cluster'lar vb.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Kaç sonuç (varsayılan 10)",
                        "default": 10,
                    }
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_clusters",
            "description": "Kubernetes cluster'larını listele. Ortam (dev/staging/production), durum veya isme göre filtrelenebilir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "environment": {
                        "type": "string",
                        "description": "Ortam filtresi: dev, staging, production",
                        "enum": ["dev", "staging", "production"],
                    },
                    "status": {
                        "type": "string",
                        "description": "Durum filtresi: active, inactive, error",
                        "enum": ["active", "inactive", "error"],
                    },
                    "search": {
                        "type": "string",
                        "description": "İsme göre arama",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cluster",
            "description": "Belirli bir cluster'ın detaylarını getir: versiyon, platform, bölge, node sayısı, sync durumu",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Cluster UUID",
                    }
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_cluster_stats",
            "description": "Cluster istatistiklerini getir: ortam, tip ve duruma göre dağılım",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "sync_cluster",
            "description": "Bir cluster'ı manuel olarak senkronize et - Kubernetes API'den en güncel namespace ve kaynak verilerini çeker",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {
                        "type": "string",
                        "description": "Senkronize edilecek cluster UUID",
                    }
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_namespaces",
            "description": "Namespace'leri listele. Cluster, ortam veya isme göre filtrelenebilir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "cluster_id": {
                        "type": "string",
                        "description": "Cluster UUID ile filtrele",
                    },
                    "environment": {
                        "type": "string",
                        "description": "Ortam filtresi",
                    },
                    "search": {
                        "type": "string",
                        "description": "İsme göre arama",
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_namespace",
            "description": "Namespace detaylarını getir: sahip team, business unit, resource quota, label ve annotation bilgileri",
            "parameters": {
                "type": "object",
                "properties": {
                    "id": {"type": "string", "description": "Namespace UUID"}
                },
                "required": ["id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_teams",
            "description": "Tüm takımları ve üyelerini listele",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "İsme göre arama"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_dependencies",
            "description": "Internal veya external dependency'leri listele. Internal: cluster içi servisler arası. External: dış sistemlere bağımlılıklar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "dep_type": {
                        "type": "string",
                        "description": "Dependency tipi",
                        "enum": ["internal", "external"],
                    }
                },
                "required": ["dep_type"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_users",
            "description": "KubeAtlas kullanıcılarını listele",
            "parameters": {
                "type": "object",
                "properties": {
                    "search": {"type": "string", "description": "İsim veya email ile ara"}
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_audit_logs",
            "description": "Audit log'ları ara: kim, ne zaman, neyi değiştirmiş. Kaynak tipi ve aksiyona göre filtrelenebilir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "resource_type": {
                        "type": "string",
                        "description": "Kaynak tipi: cluster, namespace, team, user",
                    },
                    "action": {
                        "type": "string",
                        "description": "Aksiyon filtresi: create, update, delete",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Sonuç sayısı (varsayılan 20)",
                        "default": 20,
                    },
                },
                "required": [],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_ownership_report",
            "description": "Sahiplik kapsam raporu: hangi namespace'lerin sahibi var, hangilerinin yok",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_orphaned_resources",
            "description": "Sahipsiz kaynakları bul: sahibi olmayan namespace'ler, takımı olmayan cluster'lar",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dependency_matrix",
            "description": "Tam dependency matrisini getir: namespace'ler, servisler ve dış sistemler arası tüm ilişkiler",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]


# ============================================
# Tool Execution
# ============================================

async def execute_tool(name: str, arguments: dict) -> str:
    """Execute a tool call against KubeAtlas API and return result as string."""
    try:
        result = await _call_kubeatlas(name, arguments)
        return json.dumps(result, ensure_ascii=False, default=str)
    except Exception as e:
        logger.error(f"Tool execution failed: {name} - {e}")
        return json.dumps({"error": str(e)}, ensure_ascii=False)


async def _call_kubeatlas(name: str, args: dict) -> dict:
    """Map tool name to KubeAtlas API call."""

    match name:
        # Dashboard
        case "get_dashboard_stats":
            return await kubeatlas.get("/dashboard/stats")
        case "get_recent_activities":
            limit = args.get("limit", 10)
            return await kubeatlas.get(f"/dashboard/recent-activities?limit={limit}")
        case "get_missing_info":
            limit = args.get("limit", 10)
            return await kubeatlas.get(f"/dashboard/missing-info?limit={limit}")

        # Clusters
        case "list_clusters":
            params = _build_query(args, ["environment", "status", "search"])
            return await kubeatlas.get(f"/clusters?{params}")
        case "get_cluster":
            return await kubeatlas.get(f"/clusters/{args['id']}")
        case "get_cluster_stats":
            return await kubeatlas.get("/clusters/stats")
        case "sync_cluster":
            return await kubeatlas.post(f"/clusters/{args['id']}/sync")

        # Namespaces
        case "list_namespaces":
            params = _build_query(args, ["cluster_id", "environment", "search"])
            return await kubeatlas.get(f"/namespaces?{params}")
        case "get_namespace":
            return await kubeatlas.get(f"/namespaces/{args['id']}")

        # Teams
        case "list_teams":
            params = _build_query(args, ["search"])
            return await kubeatlas.get(f"/teams?{params}")

        # Dependencies
        case "list_dependencies":
            dep_type = args.get("dep_type", "internal")
            return await kubeatlas.get(f"/dependencies/{dep_type}")

        # Users
        case "list_users":
            params = _build_query(args, ["search"])
            return await kubeatlas.get(f"/users?{params}")

        # Audit
        case "list_audit_logs":
            params = _build_query(args, ["resource_type", "action"])
            limit = args.get("limit", 20)
            return await kubeatlas.get(f"/audit?{params}&page_size={limit}")

        # Reports
        case "get_ownership_report":
            return await kubeatlas.get("/reports/ownership-coverage")
        case "get_orphaned_resources":
            return await kubeatlas.get("/reports/orphaned-resources")
        case "get_dependency_matrix":
            return await kubeatlas.get("/reports/dependency-matrix")

        case _:
            return {"error": f"Unknown tool: {name}"}


def _build_query(args: dict, keys: list[str]) -> str:
    """Build URL query string from args."""
    parts = []
    for k in keys:
        v = args.get(k)
        if v:
            parts.append(f"{k}={v}")
    return "&".join(parts)
