//! I LOVE WINDOWS

use crate::Url;
use std::path::Path;

#[must_use]
pub fn normalize_file_url(url: &Url) -> String {
    url.to_file_path().map_or_else(
        |()| format!("uri:{}", url.as_str()),
        |path| normalize_file_path(&path),
    )
}

#[must_use]
pub fn normalize_file_path(path: &Path) -> String {
    dunce::simplified(path)
        .to_string_lossy()
        .replace('\\', "/")
        .to_lowercase()
}

#[must_use]
#[allow(clippy::missing_panics_doc)]
pub fn key_to_url(key: &str) -> Url {
    key.strip_prefix("uri:").map_or_else(
        || Url::from_file_path(key).expect("Properly encoded"),
        |uri| Url::parse(uri).expect("Properly encoded"),
    )
}
