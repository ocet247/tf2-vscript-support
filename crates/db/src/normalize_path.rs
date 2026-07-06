//! I LOVE WINDOWS

use crate::Url;
use std::path::Path;

#[must_use]
pub fn normalize_file_url(url: &Url) -> String {
    url.to_file_path()
        .map_or_else(|()| url.to_string(), |path| normalize_file_path(&path))
}

#[must_use]
pub fn normalize_file_path(path: &Path) -> String {
    let s = dunce::simplified(path).to_string_lossy();
    if cfg!(any(windows, target_os = "macos")) {
        s.replace('\\', "/").to_lowercase()
    } else {
        s.to_string()
    }
}
