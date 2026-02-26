# Screenshots

This directory will contain screenshots for the documentation.

## Expected Screenshots

1. `dashboard.png` - Main dashboard view
2. `clusters.png` - Clusters list view
3. `cluster-detail.png` - Cluster detail view
4. `namespaces.png` - Namespaces list view
5. `namespace-detail.png` - Namespace detail with ownership
6. `dependencies.png` - Dependency graph visualization
7. `documents.png` - Document management view
8. `reports.png` - Reports and analytics

## Taking Screenshots

After running the application, take screenshots at 1920x1080 resolution for consistency.

```bash
# Run the application
docker-compose -f docker-compose.dev.yml up -d

# Open browser to http://localhost:3000
# Login with admin@kubeatlas.local / admin123
# Take screenshots of each view
```
