#!/bin/bash
# Migrate from v2.0 bash scripts to v3.0 skill

set -e

WORKSPACE="${HOME}/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
SKILL_DIR="${HOME}/.openclaw/skills/moltbook-automation"

echo "🔄 Migrating from v2.0 to v3.0..."
echo "================================"

# Check for existing v2 data
echo ""
echo "📁 Checking for v2 data..."

if [ -f "$MEMORY_DIR/moltbook-metrics.json" ]; then
    echo "✅ Found metrics data"
    
    # Backup
    cp "$MEMORY_DIR/moltbook-metrics.json" "$MEMORY_DIR/moltbook-metrics-v2-backup.json"
    echo "   Backed up to moltbook-metrics-v2-backup.json"
fi

if [ -f "$MEMORY_DIR/moltbook-auto-comments.log" ]; then
    echo "✅ Found comments log"
    
    # Backup
    cp "$MEMORY_DIR/moltbook-auto-comments.log" "$MEMORY_DIR/moltbook-auto-comments-v2-backup.log"
    echo "   Backed up to moltbook-auto-comments-v2-backup.log"
fi

# Convert old metrics format if needed
echo ""
echo "🔄 Converting data formats..."

if [ -f "$MEMORY_DIR/moltbook-metrics.json" ]; then
    # Check if it's the old format (single object vs history array)
    if ! jq -e '.history' "$MEMORY_DIR/moltbook-metrics.json" > /dev/null 2>&1; then
        echo "   Converting metrics to new format..."
        
        # Convert to new format
        jq '{
            current: .,
            history: [.],
            updatedAt: .timestamp
        }' "$MEMORY_DIR/moltbook-metrics.json" > "$MEMORY_DIR/moltbook-metrics-new.json"
        
        mv "$MEMORY_DIR/moltbook-metrics-new.json" "$MEMORY_DIR/moltbook-metrics.json"
        echo "   ✅ Metrics converted"
    else
        echo "   ✅ Metrics already in new format"
    fi
fi

# Run setup
echo ""
echo "📦 Running v3.0 setup..."
"$SKILL_DIR/scripts/setup.sh"

echo ""
echo "================================"
echo "✅ Migration complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Test: moltbook-automation metrics"
echo "   2. Test: moltbook-automation daily-brief"
echo "   3. Update cron jobs to use new paths"
echo ""
