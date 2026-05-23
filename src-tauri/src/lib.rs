use serde::{Deserialize, Serialize};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    io::{BufRead, BufReader, Write},
    path::PathBuf,
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        mpsc::{channel, Receiver},
        Arc, Mutex,
    },
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Manager,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct TypingPayload {
    text: String,
    language: String,
    #[serde(default, rename = "typingSpeedMs")]
    typing_speed_ms: Option<u16>,
}

#[derive(Debug, Serialize)]
struct NativeCommandResult {
    ok: bool,
    error: Option<String>,
}

#[derive(Clone, Debug, Deserialize)]
struct SidecarResponse {
    id: Option<String>,
    ok: bool,
    error: Option<String>,
}

struct SidecarProcess {
    child: Child,
    stdin: ChildStdin,
    responses: Receiver<SidecarResponse>,
}

type SharedSidecar = Arc<Mutex<Option<SidecarProcess>>>;

#[tauri::command]
fn type_text(
    app: AppHandle,
    payload: TypingPayload,
    sidecar: tauri::State<'_, SharedSidecar>,
) -> NativeCommandResult {
    println!(
        "[typing] native request lang={} chars={}",
        payload.language,
        payload.text.chars().count()
    );
    match send_to_sidecar(&app, payload, &sidecar) {
        Ok(()) => NativeCommandResult {
            ok: true,
            error: None,
        },
        Err(error) => NativeCommandResult {
            ok: false,
            error: Some(error),
        },
    }
}

#[tauri::command]
fn set_startup_enabled(app: AppHandle, enabled: bool) -> NativeCommandResult {
    match update_windows_startup(&app, enabled) {
        Ok(()) => NativeCommandResult {
            ok: true,
            error: None,
        },
        Err(error) => NativeCommandResult {
            ok: false,
            error: Some(error),
        },
    }
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(Arc::new(Mutex::new(None)) as SharedSidecar)
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focusable(false);
                let _ = window.set_shadow(true);
                let _ = window.set_always_on_top(true);
            }
            setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![type_text, set_startup_enabled])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

fn send_to_sidecar(
    app: &AppHandle,
    payload: TypingPayload,
    shared: &SharedSidecar,
) -> Result<(), String> {
    if payload.text.trim().is_empty() {
        return Ok(());
    }

    let mut guard = shared
        .lock()
        .map_err(|_| "Sidecar lock failed.".to_string())?;

    if guard.is_none() {
        *guard = Some(spawn_sidecar(app)?);
    }

    if let Some(process) = guard.as_mut() {
        if process
            .child
            .try_wait()
            .map_err(|error| error.to_string())?
            .is_some()
        {
            *guard = Some(spawn_sidecar(app)?);
        }
    }

    let process = guard
        .as_mut()
        .ok_or_else(|| "Sidecar unavailable.".to_string())?;
    let id = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_nanos()
        .to_string();

    let message = serde_json::json!({
        "id": id,
        "command": "type",
        "payload": {
            "text": payload.text,
            "language": payload.language,
            "typingSpeedMs": payload.typing_speed_ms
        }
    });

    writeln!(process.stdin, "{message}").map_err(|error| error.to_string())?;
    process.stdin.flush().map_err(|error| error.to_string())?;

    loop {
        let response = process
            .responses
            .recv_timeout(std::time::Duration::from_secs(5))
            .map_err(|_| "Timed out waiting for nut.js typing response.".to_string())?;

        if response.id.as_deref() != Some(id.as_str()) {
            continue;
        }

        return if response.ok {
            Ok(())
        } else {
            Err(response
                .error
                .unwrap_or_else(|| "nut.js failed to type into the focused app.".to_string()))
        };
    }
}

fn spawn_sidecar(app: &AppHandle) -> Result<SidecarProcess, String> {
    let resource_sidecar_path = app
        .path()
        .resource_dir()
        .map(|path| path.join("sidecar").join("dist").join("index.js"))
        .ok();

    let current_dir = std::env::current_dir().map_err(|error| error.to_string())?;
    let sidecar_path = [
        resource_sidecar_path,
        Some(current_dir.join("sidecar").join("dist").join("index.js")),
        current_dir
            .parent()
            .map(|path| path.join("sidecar").join("dist").join("index.js")),
    ]
    .into_iter()
    .flatten()
    .find(|path| path.exists())
    .ok_or_else(|| "Sidecar is missing. Run `pnpm sidecar:build` first.".to_string())?;

    println!("[typing] using sidecar {}", display_path(&sidecar_path));

    let mut command = Command::new("node");
    command
        .arg(sidecar_path)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    command.creation_flags(0x08000000);

    let mut child = command
        .spawn()
        .map_err(|error| format!("Failed to start nut.js sidecar: {error}"))?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "Failed to open sidecar stdin.".to_string())?;

    let (tx, rx) = channel::<SidecarResponse>();

    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines().map_while(Result::ok) {
                if let Ok(response) = serde_json::from_str::<SidecarResponse>(&line) {
                    let _ = tx.send(response.clone());
                    if !response.ok {
                        eprintln!("sidecar error: {:?}", response.error);
                    }
                }
            }
        });
    }

    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines().map_while(Result::ok) {
                eprintln!("sidecar stderr: {line}");
            }
        });
    }

    Ok(SidecarProcess {
        child,
        stdin,
        responses: rx,
    })
}

fn display_path(path: &PathBuf) -> String {
    path.to_string_lossy().to_string()
}

fn setup_tray(app: &mut tauri::App) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main-tray")
        .tooltip("Voice Typing")
        .menu(&menu);

    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    tray.on_menu_event(|app, event| match event.id.as_ref() {
        "show" => {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
        "quit" => app.exit(0),
        _ => {}
    })
    .on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
        } = event
        {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    })
    .build(app)?;

    Ok(())
}

#[cfg(windows)]
fn update_windows_startup(_app: &AppHandle, enabled: bool) -> Result<(), String> {
    use winreg::{enums::HKEY_CURRENT_USER, RegKey};

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);
    let (run_key, _) = hkcu
        .create_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Run")
        .map_err(|error| error.to_string())?;
    let app_name = "BengaliEnglishVoiceTyping";

    if enabled {
        let exe = std::env::current_exe().map_err(|error| error.to_string())?;
        run_key
            .set_value(app_name, &format!("\"{}\"", exe.display()))
            .map_err(|error| error.to_string())?;
    } else {
        let _ = run_key.delete_value(app_name);
    }

    Ok(())
}

#[cfg(not(windows))]
fn update_windows_startup(_app: &AppHandle, _enabled: bool) -> Result<(), String> {
    Err("Startup integration is only available on Windows.".to_string())
}
