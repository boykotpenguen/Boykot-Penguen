# Boykot Penguen Browser Extension

Boykot Penguen is a browser extension that helps users identify and track boycotted brands and domains. It provides real-time notifications when users visit websites associated with boycotted entities and allows users to manage their boycott lists.

## Features

- 🔍 Real-time detection of boycotted brands and domains
- 🎨 Customizable notifications and banners
- 🔄 Automatic list updates from remote sources
- 📋 Easy list management through options page
- 📜 Manifest v3
- 🛡️ Privacy-focused with local storage

## Usage

Since it has not yet been added to Firefox and Chrome's own extension pages, manual installation is required. You can download the compiled version from the Releases section or clone the project and compile the project yourself by following the [Installation](#installation) section. To add it to the browser, see the [browser](#add-to-browser) section.

### Managing Lists

1. Click the extension icon to open the popup
2. You can see activated lists.
3. Go to the options page to manage your lists.
4. Import lists from JSON files or remote URLs.
5. Edit lists to add/remove brands and domains.
6. Configure auto-update settings.

### Auto-Update Settings

- Enable/disable automatic updates
- Set update interval (6h to 1 week)
- Add multiple import URLs

### Notifications

- Choose between banner and alert notifications
- Customize banner position and color
- Set alert duration

## Installation

[Git](https://git-scm.com/) and [pnpm'in](https://pnpm.io/installation) is required to install the project.

1. Clone the repository:

```bash
git clone https://github.com/boykotpenguen/Boykot-Penguen.git
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the extension:

See [Available Scripts](#available-scripts) for different browser options.

```bash
pnpm build:ff
```

### Add to Browser

#### Firefox

- Firefox tarayıcınızda `about:debugging#/runtime/this-firefox` adresine gidin
- "Geçici eklenti yükle..."ye tıklayın.
- Yüklenecek klasör içerisindeki `manifest.json` seçin

#### Chrome

- Chrome tarayıcınızda `chrome://extensions/` adresine gidin
- "Geliştirici modu"nu açın
- "Paketlenmemiş öğe yükle" butonuna tıklayın
- Yüklenecek klasörü seçin

## Development

### Project Structure

```
src/
├──
├── content.tsx        # Content script for page injection
├── popup.tsx          # Extension popup interface
├── options.tsx        # Options page for list management
└── *.module.css       # CSS modules for styling
    background/
    └── index.ts       # Background script for extension
    util/
    ├── autoUpdate.ts       # Auto-update functionality
    ├── brandDetector.ts    # Brand and domain detection functionality
    ├── storage.ts          # Storage management utilities
    └── types.ts            # TypeScript type definitions
```

### Available Scripts

- `pnpm dev` - Defult for Chrome
- `pnpm build:chrome`
- `pnpm build:ff`
- `pnpm build:edge` - Not tested
- `pnpm build:brave` - Not tested
- `pnpm build:opera` - Not tested
- `pnpm package:chrome`
- `pnpm package:ff`
- `pnpm package:edge` - Not tested
- `pnpm package:brave` - Not tested
- `pnpm package:opera` - Not tested

## Contributing

Since my field of work is not web, there may be many wrong approaches or bugs. Since I get help from AI in some of the code, I expect it to happen. If you see a problem, I would be happy if you open an Issue or Pull Request. Similarly, if there is a new feature you want to add, you can open an Issue.

## Tech

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Plasmo](https://www.plasmo.com/)

## Lisans

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
