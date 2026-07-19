mod normalize_path;
use std::path::Path;

pub use dashmap::DashMap;
pub use lsp_types::Url;

pub use crate::normalize_path::{normalize_file_path, normalize_file_url};

#[salsa::input]
#[derive(Debug)]
pub struct File {
    #[returns(ref)]
    pub text: String,
    // pub version: i32,
}

pub fn file_iter<Db: BaseDatabase>(db: &Db) -> impl Iterator<Item = (Url, File)> {
    db.get_urls().iter().map(|entry| {
        let (file, url) = entry.pair();
        (url.clone(), *file)
    })
}

#[salsa::db]
pub trait BaseDatabase: salsa::Database {
    fn get_files(&self) -> &DashMap<String, File>;
    fn get_urls(&self) -> &DashMap<File, Url>;

    fn get_file(&self, url: &Url) -> Option<File> {
        let key = normalize_file_url(url);
        self.get_file_from_key(&key)
    }

    fn get_file_from_path(&self, path: &Path) -> Option<File> {
        let key = normalize_file_path(path);
        self.get_file_from_key(&key)
    }

    fn get_file_from_key(&self, key: &str) -> Option<File> {
        self.get_files().get(key).map(|f| *f)
    }

    fn get_url(&self, file: &File) -> Option<Url> {
        self.get_urls().get(file).map(|u| u.clone())
    }

    fn open_file(&self, url: &Url, text: String /* , version: i32 */) -> File {
        let key = normalize_file_url(url);
        self.open_file_with_key(key, url.clone(), text /* , version */)
    }

    /// # Errors
    /// If path is not absolute/malformed
    /// If file does not exist
    fn open_file_from_path(&self, path: &Path) -> Result<File, String> {
        let key = normalize_file_path(path);
        if let Some(file) = self.get_file_from_key(&key) {
            return Ok(file);
        }
        let url = Url::from_file_path(path).map_err(|()| "Invalid absolute path".to_owned())?;
        let text = std::fs::read_to_string(path).map_err(|_| "File does not exist".to_owned())?;
        Ok(self.open_file_with_key(key, url, text /* , 1 */))
    }

    fn open_file_with_key(
        &self,
        key: String,
        url: Url,
        text: String, /* , version: i32 */
    ) -> File {
        if let Some(file) = self.get_file_from_key(&key) {
            self.get_urls().insert(file, url);
            return file;
        }
        let file = File::new(self, text /* , version */);
        self.get_files().insert(key, file);
        self.get_urls().insert(file, url);
        file
    }

    fn delete_file(&self, url: &Url) -> Option<File> {
        let key = normalize_file_url(url);
        self.delete_file_with_key(&key)
    }

    fn delete_file_with_key(&self, key: &str) -> Option<File> {
        let file = *self.get_files().get(key)?;
        self.get_urls().remove(&file);
        self.get_files().remove(key);
        Some(file)
    }
}
