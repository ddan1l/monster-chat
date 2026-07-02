use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg(target_os = "windows")]
fn flash_taskbar(window: &tauri::WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        FlashWindowEx, FLASHWINFO, FLASHW_TIMERNOFG, FLASHW_TRAY,
    };

    if let Ok(hwnd) = window.hwnd() {
        let mut info = FLASHWINFO {
            cbSize: std::mem::size_of::<FLASHWINFO>() as u32,
            hwnd: HWND(hwnd.0),
            dwFlags: FLASHW_TRAY | FLASHW_TIMERNOFG,
            uCount: u32::MAX,
            dwTimeout: 0,
        };
        unsafe {
            let _ = FlashWindowEx(&mut info);
        };
    }
}

#[cfg(target_os = "windows")]
fn stop_flash_taskbar(window: &tauri::WebviewWindow) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{FlashWindowEx, FLASHWINFO, FLASHW_STOP};

    if let Ok(hwnd) = window.hwnd() {
        let mut info = FLASHWINFO {
            cbSize: std::mem::size_of::<FLASHWINFO>() as u32,
            hwnd: HWND(hwnd.0),
            dwFlags: FLASHW_STOP,
            uCount: 0,
            dwTimeout: 0,
        };
        unsafe {
            let _ = FlashWindowEx(&mut info);
        };
    }
}

#[cfg(target_os = "macos")]
fn flash_dock(window: &tauri::WebviewWindow) {
    use tauri::UserAttentionType;
    let _ = window.request_user_attention(Some(UserAttentionType::Informational));
}

#[cfg(target_os = "macos")]
fn stop_flash_dock(window: &tauri::WebviewWindow) {
    let _ = window.request_user_attention(None);
}

fn show_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(target_os = "windows")]
        stop_flash_taskbar(&window);
        #[cfg(target_os = "macos")]
        stop_flash_dock(&window);
    }
}

#[tauri::command]
fn start_flash(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        #[cfg(target_os = "windows")]
        flash_taskbar(&window);
        #[cfg(target_os = "macos")]
        flash_dock(&window);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let show = MenuItem::with_id(app, "show", "Открыть", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Выйти", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .tooltip("Monster Chat")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let is_visible = window.is_visible().unwrap_or(false);
                            if is_visible {
                                let _ = window.hide();
                            } else {
                                show_window(app);
                            }
                        }
                    }
                })
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => show_window(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![start_flash])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
