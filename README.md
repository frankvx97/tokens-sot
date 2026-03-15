# Tokens SOT

Bridge your design system and code effortlessly.

![Version](https://img.shields.io/badge/version-1.1.2-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## What is this?

Tokens SOT is a Figma plugin that transforms your design tokens—colors, spacing, typography, shadows, and more—into ready-to-use code. Whether you're working with CSS, Sass, JavaScript, or Tailwind, this plugin speaks your language.

Think of it as a translator between design and development. You maintain your source of truth in Figma using variables and styles, and Tokens SOT converts them into the format your project needs.

## What it does

- **Export design tokens** from Figma variables and styles
- **Multiple format support**: CSS, Sass, LESS, Stylus, JavaScript, JSON, and Tailwind
- **Flexible organization**: Export by collection, mode, or customize grouping
- **Copy or download**: Get your tokens on the clipboard or as files
- **Stay in sync**: Quickly update your codebase when your design system evolves

Perfect for designers who want to see their design decisions in code, or for teams bridging the gap between design and development.

## Get started

To work with the plugin's source code, you'll need a few tools installed on your computer.

### What you'll need

1. **Node.js** – This is what runs the build process. Download it from [nodejs.org](https://nodejs.org/en/download/)

2. **A code editor (IDE)** – We recommend [Visual Studio Code](https://code.visualstudio.com/), which works great for editing plugin code, but you could use any IDE you want.

### Setting up

Once you have Node.js installed, open your command line or terminal and navigate to the plugin folder. Then run:

```
npm install
```

This installs everything the plugin needs to run.

### Building the plugin

To build the plugin, run:

```
npm run build
```

Or, if you want the plugin to automatically rebuild as you make changes:

1. Open the plugin folder in Visual Studio Code
2. Go to **Terminal > Run Build Task...**
3. Select **npm: watch**

Now whenever you save a file, the plugin will automatically rebuild.

### Running in Figma

1. In Figma, go to **Menu > Plugins > Development > Import plugin from manifest...**
2. Select the `manifest.json` file from this folder
3. The plugin will appear in your Plugins menu

---

Made with love from 🇸🇻 by [Franklin Perez](https://www.linkedin.com/in/frank-px/).

Help me improve this plugin by providing your feedback by filling this quick  [survey](https://tally.so/r/gDMqyN) 🙏.
