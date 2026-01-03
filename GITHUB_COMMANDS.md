# GitHub Upload Commands - AnimeSalt API v5.0

## Quick Upload Commands

```bash
# Navigate to the anime-api directory
cd anime-api

# Initialize git repository (first time only)
git init

# Add all files to staging
git add .

# Create commit with description
git commit -m "AnimeSalt API v5.0 - Restored original animesalt.cc structure with authentic data extraction

- Restored authentic animesalt.cc homepage data structure
- Fixed featured section extraction using original methodology
- Updated trending algorithm to mix most-watched series
- Comprehensive genre and network filter system
- Fixed root /api endpoint with full endpoint documentation
- Enhanced URL pattern recognition for anime links
- All bugs fixed: module paths, CORS, regex patterns, helper functions"

# Add remote repository (replace with your actual repository URL)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to main branch
git push -u origin main
```

## For Subsequent Updates

```bash
# Add all modified files
git add .

# Create commit with update description
git commit -m "Your commit message describing the changes"

# Push to main branch
git push origin main
```

## Initial Setup (First Time Only)

If you haven't created the repository on GitHub yet:

1. Go to https://github.com/new
2. Repository name: `anime-api` (or your preferred name)
3. Description: "AnimeSalt API - Production Edition v5.0"
4. Set as Public or Private
5. Do NOT initialize with README (we already have one)
6. Click "Create repository"
7. Copy the repository URL shown
8. Use the commands above, replacing `YOUR_USERNAME/YOUR_REPO_NAME`

## If Using SSH (Recommended for Security)

```bash
# Initialize
git init
git add .
git commit -m "Your commit message"

# Add SSH remote (replace with your SSH URL)
git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git

# Push
git push -u origin main
```

## SSH Key Setup (If Not Already Configured)

```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"

# Start SSH agent
eval "$(ssh-agent -s)"

# Add SSH key to agent
ssh-add ~/.ssh/id_ed25519

# Copy public key to GitHub
cat ~/.ssh/id_ed25519.pub

# Add this key to GitHub:
# GitHub > Settings > SSH and GPG keys > New SSH key
```

## Clone and Deploy on Another Machine

```bash
# Clone repository
git clone git@github.com:YOUR_USERNAME/YOUR_REPO_NAME.git
cd YOUR_REPO_NAME

# Install dependencies
npm install

# Start server
npm start
```

## Verify Before Upload

Check your changes before committing:

```bash
# Check git status
git status

# See what files will be committed
git diff --stat

# View specific changes
git diff
```

## Rollback (If Needed)

```bash
# Undo last commit (keep changes in staging)
git reset --soft HEAD~1

# Undo last commit (remove changes from staging)
git reset HEAD~1

# Undo last commit and discard all changes
git reset --hard HEAD~1
