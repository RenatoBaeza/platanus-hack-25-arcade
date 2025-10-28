# 🎮 Platanus Hack 25: Arcade Challenge

At [Platanus Hack 25](https://hack.platan.us) we will have an arcade machine. While we could put some cool retro games on it, it is way better if it can be turned into a challenge.

**Your mission:** Build the best arcade game using Phaser 3 (JS Game Lib) that will run on our physical arcade machine!

---

## 🏆 Prize

- 🎯 **Your game will be playing non-stop in the hackathon arcade**
- 💵 **$100 USD in cash**
- 🎟️ **A slot to participate in Platanus Hack**

---

## 📋 Restrictions

Your game must comply with these technical restrictions:

### Size Limit
- ✅ **Maximum 50KB after minification** (before gzip)
- The game code is automatically minified - focus on writing good code

### Code Restrictions
- ✅ **Pure vanilla JavaScript only** - No `import` or `require` statements
- ✅ **No external URLs** - No `http://`, `https://`, or `//` (except `data:` URIs for base64)
- ✅ **No network calls** - No `fetch`, `XMLHttpRequest`, or similar APIs
- ✅ **Sandboxed environment** - Game runs in an iframe with no internet access

### What You CAN Use
- ✅ **Phaser 3** (v3.87.0) - Loaded externally via CDN (not counted in size limit)
- ✅ **Base64-encoded images** - Using `data:` URIs
- ✅ **Procedurally generated graphics** - Using Phaser's Graphics API
- ✅ **Generated audio tones** - Using Phaser's Web Audio API
- ✅ **Canvas-based rendering and effects**

### Controls
- 🕹️ Keep controls simple - they will be mapped to an arcade controller
- 🎮 Recommended: Arrow keys, WASD, spacebar, or simple mouse clicks

---

## ⏰ Deadline & Submission

**Deadline:** Friday, November 14, 2025 at 23:59 (Santiago time)

### How to Submit

Submitting your project is easy:

1. **Save your changes** - Make sure `game.js` and `metadata.json` are ready
2. **Git push** - Push your code to your repository:
   ```bash
   git add .
   git commit -m "Final submission"
   git push
   ```
3. **Hit Submit** - Click the submit button in the development UI and follow the steps

That's it! 🎉

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Start Development Server
```bash
pnpm dev
```
This starts a server at `http://localhost:3000` with live restriction checking.

### 3. Build Your Game
- **Edit `game.js`** - Write your arcade game code
- **Update `metadata.json`** - Set your game name and description
- **Watch the dev server** - It shows live updates on file size and restrictions

---

## 🤖 Vibecoding Your Game

This challenge is designed for **vibecoding** - building your game with AI assistance!

### What We've Set Up For You

- **`AGENTS.md`** - Pre-configured instructions so your IDE (Cursor, Windsurf, etc.) understands the challenge
- **`docs/phaser-quick-start.md`** - Quick reference guide for Phaser 3
- **`docs/phaser-api.md`** - Comprehensive Phaser 3 API documentation

Your AI agent already knows:
- ✅ All the challenge restrictions
- ✅ How to use Phaser 3 effectively
- ✅ Best practices for staying under 50KB
- ✅ What files to edit (`game.js` and `metadata.json` only)

### How to Vibecode

Simply tell your AI assistant what game you want to build! For example:

> "Create a Space Invaders clone with colorful enemies"
> 
> "Build a flappy bird style game with procedural graphics"
> 
> "Make a breakout game with power-ups"

Your AI will handle the implementation, keeping everything within the restrictions automatically!
