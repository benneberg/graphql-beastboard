# BeastBoard Chrome Extension – GraphQL Dashboard Overlay

This is the **Chrome Extension** version of The GraphQL BeastBoard.  
It adds an interactive dashboard overlay on any website, perfect for rapid API testing.

---

## 🌟 Features

- Query Builder with syntax highlighting (CodeMirror)  
- Schema introspection & formatted display  
- WebSocket subscriptions  
- AI Query Generation & Optimization (Azure/OpenAI/Anthropic)  
- Query History & Favorites  
- Response tabs (Response / Headers / Timing)  
- Schema export (SDL / JSON) & copy to clipboard  
- Draggable / resizable overlay & floating button  
- Keyboard shortcut: Ctrl+Shift+G (Cmd+Shift+G on Mac)  
- Slide-in Learning Center panel  
- Dark/Light theme toggle  
- LocalStorage persistence per domain  

---

## ⚡ Installation Instructions

1. Create a folder called `graphql-dashboard-ultimate`  
2. Add these files:
   - `manifest.json`  
   - `background.js`  
   - `content.js`  
   - `styles.css`  

3. Create placeholder icons (16x16, 48x48, 128x128 pixels)  

```bash
convert -size 128x128 xc:blue -fill white -pointsize 80 -gravity center -annotate +0+0 "GQL" icon128.png
convert icon128.png -resize 48x48 icon48.png
convert icon128.png -resize 16x16 icon16.png

	4.	Load the extension in Chrome:
	•	Open chrome://extensions/
	•	Enable Developer mode (top-right toggle)
	•	Click “Load unpacked”
	•	Select your graphql-dashboard-ultimate folder

⸻

✨ Usage
	•	Press Ctrl+Shift+G (Cmd+Shift+G on Mac) to open the overlay
	•	Click the minimize button to collapse into a floating icon
	•	Drag to move, resize from the bottom-right corner
	•	Configure endpoints, API keys, and AI settings via the settings panel
	•	Copy queries, responses, or schemas with one click

⸻

💡 Notes
	•	Per-domain state is preserved (position, size, last queries).
	•	AI features require valid API keys for your provider.

---
