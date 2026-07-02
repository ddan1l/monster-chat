use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, WindowEvent,
};

#[cfg(windows)]
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

#[cfg(windows)]
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

fn show_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        #[cfg(windows)]
        stop_flash_taskbar(&window);
    }
}

#[tauri::command]
fn start_flash(app: tauri::AppHandle) {
    #[cfg(windows)]
    if let Some(window) = app.get_webview_window("main") {
        flash_taskbar(&window);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_fs::init())
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
