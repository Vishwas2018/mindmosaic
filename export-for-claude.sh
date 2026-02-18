#!/usr/bin/env bash

# ================================
# MindMosaic → Claude Export Script
# ================================

OUTPUT="claude-context.txt"

# Clean previous output
rm -f "$OUTPUT"

echo "### MindMosaic Frontend Context Export" >> "$OUTPUT"
echo "Generated on: $(date)" >> "$OUTPUT"
echo "" >> "$OUTPUT"

# ----------------
# Folder Structure
# ----------------
echo "## Project Structure" >> "$OUTPUT"
echo '```' >> "$OUTPUT"

find . \
  -maxdepth 5 \
  -type d \
  ! -path "./node_modules*" \
  ! -path "./.git*" \
  ! -path "./dist*" \
  ! -path "./build*" \
  ! -path "./.next*" \
  ! -path "./coverage*" \
  | sed 's|^\./||' \
  | sort >> "$OUTPUT"

echo '```' >> "$OUTPUT"
echo "" >> "$OUTPUT"

# ----------------
# Key Config Files
# ----------------
echo "## Configuration Files" >> "$OUTPUT"

for file in \
  package.json \
  tsconfig.json \
  vite.config.ts \
  tailwind.config.* \
  postcss.config.* \
  src/main.tsx \
  src/App.tsx
do
  if [ -f "$file" ]; then
    echo "" >> "$OUTPUT"
    echo "### $file" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
    sed -n '1,300p' "$file" >> "$OUTPUT"
    echo '```' >> "$OUTPUT"
  fi
done

# ----------------
# Routing & Layout
# ----------------
echo "" >> "$OUTPUT"
echo "## Routing & Layout" >> "$OUTPUT"

find src -type f \( \
  -name "*Router*.tsx" -o \
  -name "*Layout*.tsx" -o \
  -name "routes*.ts*" \
\) | while read -r file; do
  echo "" >> "$OUTPUT"
  echo "### $file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  sed -n '1,300p' "$file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
done

# ----------------
# Exam Runtime Core
# ----------------
echo "" >> "$OUTPUT"
echo "## Exam Runtime (Core)" >> "$OUTPUT"

find src -type f \( \
  -name "*Exam*.tsx" -o \
  -name "*Question*.tsx" -o \
  -name "*Timer*.tsx" -o \
  -name "*Progress*.tsx" -o \
  -name "*Integrity*.ts*" \
\) | while read -r file; do
  echo "" >> "$OUTPUT"
  echo "### $file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  sed -n '1,400p' "$file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
done

# ----------------
# State Management
# ----------------
echo "" >> "$OUTPUT"
echo "## State Management (Zustand / Stores)" >> "$OUTPUT"

find src -type f \( \
  -name "*store*.ts*" -o \
  -name "*zustand*.ts*" \
\) | while read -r file; do
  echo "" >> "$OUTPUT"
  echo "### $file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  sed -n '1,400p' "$file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
done

# ----------------
# Supabase / Backend Integration
# ----------------
echo "" >> "$OUTPUT"
echo "## Supabase Integration" >> "$OUTPUT"

find src -type f \( \
  -name "*supabase*.ts*" -o \
  -name "*auth*.ts*" -o \
  -name "*api*.ts*" \
\) | while read -r file; do
  echo "" >> "$OUTPUT"
  echo "### $file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  sed -n '1,300p' "$file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
done

# ----------------
# Styling & Theme
# ----------------
echo "" >> "$OUTPUT"
echo "## Styling & Theme" >> "$OUTPUT"

find src -type f \( \
  -name "*.css" -o \
  -name "*theme*.ts*" \
\) | while read -r file; do
  echo "" >> "$OUTPUT"
  echo "### $file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
  sed -n '1,300p' "$file" >> "$OUTPUT"
  echo '```' >> "$OUTPUT"
done

# ----------------
# Final Notes
# ----------------
echo "" >> "$OUTPUT"
echo "## Notes" >> "$OUTPUT"
echo "- Backend contracts must remain unchanged." >> "$OUTPUT"
echo "- Exam scoring and persistence are deterministic." >> "$OUTPUT"
echo "- Frontend revamp only." >> "$OUTPUT"

echo ""
echo "✅ Export complete: $OUTPUT"
