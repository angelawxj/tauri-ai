use tauri::{Manager, Webview};

#[tauri::command]
pub async fn browser_eval(webview: Webview, label: String, script: String) -> Result<String, String> {
    let target = webview
        .app_handle()
        .get_webview(&label)
        .ok_or_else(|| format!("browser webview '{label}' not found"))?;
    let (sender, receiver) = std::sync::mpsc::sync_channel(1);
    target
        .eval_with_callback(script, move |result| {
            let _ = sender.send(result);
        })
        .map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        receiver
            .recv_timeout(std::time::Duration::from_secs(10))
            .map_err(|error| error.to_string())
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub fn browser_navigate(webview: Webview, label: String, url: String) -> Result<(), String> {
    let target = webview
        .app_handle()
        .get_webview(&label)
        .ok_or_else(|| format!("browser webview '{label}' not found"))?;
    let parsed = url.parse().map_err(|error: url::ParseError| error.to_string())?;
    target.navigate(parsed).map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn browser_capture_screenshot(webview: Webview, label: String) -> Result<String, String> {
    let target = webview
        .app_handle()
        .get_webview(&label)
        .ok_or_else(|| format!("browser webview '{label}' not found"))?;
    #[cfg(windows)]
    {
        use webview2_com::{CallDevToolsProtocolMethodCompletedHandler, Microsoft::Web::WebView2::Win32::ICoreWebView2};
        use windows::core::HSTRING;
        let (sender, receiver) = std::sync::mpsc::sync_channel(1);
        let error_sender = sender.clone();
        target
            .with_webview(move |platform| {
                let result = (|| -> windows::core::Result<()> {
                    let controller = platform.controller();
                    let core: ICoreWebView2 = unsafe { controller.CoreWebView2()? };
                    let callback = CallDevToolsProtocolMethodCompletedHandler::create(Box::new(
                        move |status, json| {
                            let value = status.map(|_| json).map_err(|error| error.to_string());
                            let _ = sender.send(value);
                            Ok(())
                        },
                    ));
                    unsafe {
                        core.CallDevToolsProtocolMethod(
                            &HSTRING::from("Page.captureScreenshot"),
                            &HSTRING::from(r#"{"format":"png","fromSurface":true}"#),
                            &callback,
                        )?;
                    }
                    Ok(())
                })();
                if let Err(error) = result {
                    let _ = error_sender.send(Err(error.to_string()));
                }
            })
            .map_err(|error| error.to_string())?;
        let json = tauri::async_runtime::spawn_blocking(move || {
            receiver
                .recv_timeout(std::time::Duration::from_secs(10))
                .map_err(|error| error.to_string())?
        })
        .await
        .map_err(|error| error.to_string())??;
        let value: serde_json::Value = serde_json::from_str(&json).map_err(|error| error.to_string())?;
        let data = value["data"].as_str().ok_or_else(|| "screenshot data missing".to_string())?;
        return Ok(format!("data:image/png;base64,{data}"));
    }
    #[cfg(not(windows))]
    Err("native screenshot capture is currently available on Windows".into())
}
