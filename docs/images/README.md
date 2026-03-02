# KubeAtlas Screenshots

This directory contains screenshots and visual assets for the KubeAtlas documentation.

## Required Screenshots

Please add the following screenshots after deployment:

### Dashboard
- `dashboard.png` - Main dashboard overview with statistics and charts
- `dashboard-dark.png` - Dark mode version (optional)

### Cluster Management
- `clusters.png` - Cluster list view with filters
- `cluster-detail.png` - Individual cluster details

### Namespace Management
- `namespaces.png` - Namespace inventory view
- `namespace-detail.png` - Detailed namespace view with ownership info

### Dependencies
- `dependencies.png` - Dependency graph visualization
- `dependency-detail.png` - Dependency details panel

### Documents
- `documents.png` - Document repository list
- `document-viewer.png` - Document preview/viewer

### Teams & Access Control
- `teams.png` - Team management interface
- `team-detail.png` - Team member and assignment view

### Audit & Compliance
- `audit-logs.png` - Audit trail view
- `reports.png` - Compliance reports

### Settings
- `settings.png` - Application settings
- `profile.png` - User profile

## Screenshot Guidelines

1. **Resolution**: Use 1920x1080 or higher
2. **Format**: PNG with transparency where appropriate
3. **File Size**: Keep under 500KB each (use compression)
4. **Content**: Use sample/demo data, no sensitive information
5. **Consistency**: Use same browser window size for all screenshots

## Image Optimization

```bash
# Install pngquant for compression
brew install pngquant  # macOS
apt-get install pngquant  # Ubuntu

# Compress images
pngquant --quality=65-80 --force --output dashboard.png dashboard-original.png
```

## Dark Mode Screenshots

If supporting dark mode, create separate screenshots with:
- `*-dark.png` suffix
- Consistent color scheme
- Same content/layout as light mode

## Logo Assets

Place logo files here:
- `logo.png` - Main logo (transparent background)
- `logo-light.png` - Light version for dark backgrounds
- `logo-dark.png` - Dark version for light backgrounds
- `favicon.png` - 32x32 favicon
- `icon.svg` - Vector version of icon

## Architecture Diagrams

- `architecture.png` - System architecture diagram
- `data-flow.png` - Data flow diagram
- `deployment.png` - Deployment architecture

---

**Note**: These are placeholders. Replace with actual screenshots after your first deployment.
