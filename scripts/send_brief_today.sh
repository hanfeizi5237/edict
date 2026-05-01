#!/bin/bash
GITHUB=$(sed -n '/## 🔥 GitHub/,/---/{/## 🔥 GitHub/d;/---/d;p}' /root/.openclaw/workspace-zaochao/data/brief-2026-04-19.md | head -30)
SKILLS=$(sed -n '/## 🧩 ClawHub/,/---/{/## 🧩 ClawHub/d;/---/d;p}' /root/.openclaw/workspace-zaochao/data/brief-2026-04-19.md | head -30)
OPENCLAW=$(sed -n '/## 🦞 OpenClaw/,/---/{/## 🦞 OpenClaw/d;/---/d;p}' /root/.openclaw/workspace-zaochao/data/brief-2026-04-19.md | head -30)
MODELS=$(sed -n '/## 🤖 新模型/,/---/{/## 🤖 新模型/d;/---/d;p}' /root/.openclaw/workspace-zaochao/data/brief-2026-04-19.md | head -30)

python3 /root/.openclaw/scripts/send_morning_brief.py \
    --webhook "https://open.feishu.cn/open-apis/bot/v2/hook/f9ffd6fe-0d3a-482f-b9b6-440a60f5e855" \
    --date "2026-04-19" \
    --github "$GITHUB" \
    --skills "$SKILLS" \
    --openclaw "$OPENCLAW" \
    --models "$MODELS"
