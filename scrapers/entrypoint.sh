#!/bin/bash
# Scraper entrypoint - runs on schedule

INTERVAL_HOURS=${SCRAPE_INTERVAL_HOURS:-4}
INTERVAL_SECONDS=$((INTERVAL_HOURS * 3600))

echo "🕐 Scraper starting - will run every ${INTERVAL_HOURS} hours"

# Initial delay to let DB fully initialize
sleep 20

while true; do
  echo ""
  echo "======================================="
  echo "Starting scrape at $(date)"
  echo "======================================="
  
  npm run scrape -- --store all 2>&1 | tee -a /app/logs/scraper-$(date +%Y%m%d).log
  
  echo "Scrape complete. Next run in ${INTERVAL_HOURS} hours."
  sleep ${INTERVAL_SECONDS}
done
