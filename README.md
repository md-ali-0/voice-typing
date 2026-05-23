# Bengali + English Voice Typing

A production-oriented lightweight Windows desktop voice typing widget built with Tauri, React, TypeScript, TailwindCSS, Web Speech API, and nut.js.

## Folder Structure

```text
.
├── sidecar/
│   ├── src/
│   │   ├── index.ts
│   │   └── nutTypingService.ts
│   └── tsconfig.json
├── src/
│   ├── components/
│   │   ├── LanguageSwitch.tsx
│   │   ├── MicButton.tsx
│   │   ├── SettingsPopover.tsx
│   │   ├── StatusIndicator.tsx
│   │   └── VoiceWidget.tsx
│   ├── hooks/
│   │   ├── useGlobalShortcut.ts
│   │   ├── useSpeechRecognition.ts
│   │   └── useTypeIntoFocusedApp.ts
│   ├── services/
│   │   ├── punctuationService.ts
│   │   ├── speechRecognitionService.ts
│   │   └── typingService.ts
│   ├── stores/
│   │   └── appStore.ts
│   ├── tauri/
│   │   ├── commands.ts
│   │   └── window.ts
│   ├── types/
│   │   ├── app.ts
│   │   └── speech.d.ts
│   ├── utils/
│   │   ├── constants.ts
│   │   └── persistence.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── styles.css
├── src-tauri/
│   ├── capabilities/
│   │   └── default.json
│   ├── icons/
│   │   └── icon.ico
│   ├── src/
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── build.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── vite.config.ts
```

## Setup

Install prerequisites:

- Windows 10/11
- Microsoft Edge WebView2 Runtime
- Rust stable
- Node.js 20+
- Visual Studio Build Tools with Desktop development with C++

Install dependencies:

```powershell
pnpm install
```

## Run

```powershell
pnpm sidecar:build
pnpm tauri:dev
```

Use `Ctrl + Shift + V` to toggle listening. Use the language chip to switch between Bengali and English.
For the most reliable external typing, focus the target input first and toggle listening with `Ctrl + Shift + V`; the floating window is configured as non-focusable so button clicks should not steal the target focus.
The settings button expands the widget in-place, so settings stay inside the floating window instead of being clipped.

## Build

```powershell
pnpm tauri:build
```

The installer is generated under `src-tauri\target\release\bundle`.

## Production Notes

- Speech recognition uses the Web Speech API available through WebView2. It may require internet access depending on the Windows speech stack and browser engine behavior.
- System-wide typing is delegated to a nut.js sidecar process through Tauri shell APIs.
- The app avoids clipboard paste by default and uses simulated keyboard typing.
- Language, auto punctuation, startup preference, and tray preference are persisted in local storage.

## Troubleshooting

- Microphone denied: allow microphone permission for the app/WebView2 in Windows privacy settings.
- Speech recognition unavailable: install/update Microsoft Edge WebView2 Runtime and confirm `webkitSpeechRecognition` is available.
- No text appears in the target app: focus the target input before speaking and run the app with normal user permissions. Some elevated apps require the voice app to also run elevated.
- Widget clicks steal typing focus: restart the app after this update. The native window is set to non-focusable at startup and again from the frontend.
- `link.exe not found`: install Visual Studio Build Tools 2022 with the `Desktop development with C++` workload, then restart the terminal. This provides the MSVC linker Rust needs on Windows.
- nut.js native install errors: install Visual Studio Build Tools and retry `pnpm install`.
- Recognition stops: the app automatically restarts while listening; network failures are surfaced in the status text.
