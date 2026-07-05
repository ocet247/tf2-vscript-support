mod normalize_path;
pub use dashmap::DashMap;
pub use lsp_types::Url;

use crate::normalize_path::key_to_url;
pub use crate::normalize_path::{normalize_file_path, normalize_file_url};

#[salsa::input]
#[derive(Debug)]
pub struct File {
    #[returns(ref)]
    pub text: String,
}

pub fn file_iter<Db: BaseDatabase>(db: &Db) -> impl Iterator<Item = (Url, File)> {
    db.get_files().iter().map(|entry| {
        let (url, file) = entry.pair();
        (key_to_url(url), *file)
    })
}

#[salsa::db]
pub trait BaseDatabase: salsa::Database {
    fn get_files(&self) -> &DashMap<String, File>;
    fn get_keys(&self) -> &DashMap<File, String>;

    fn get_file(&self, url: &Url) -> Option<File> {
        let key = normalize_file_url(url);
        self.get_file_from_key(&key)
    }

    fn get_file_from_key(&self, key: &str) -> Option<File> {
        self.get_files().get(key).map(|file| *file)
    }

    fn get_url(&self, file: &File) -> Option<Url> {
        self.get_keys().get(file).map(|path| key_to_url(&path))
    }

    fn open_file(&self, url: &Url, text: String) -> File {
        let key = normalize_file_url(url);
        self.open_file_with_key(key, text)
    }

    fn open_file_with_key(&self, key: String, text: String) -> File {
        let file = File::new(self, text);
        self.get_files().insert(key.clone(), file);
        self.get_keys().insert(file, key);
        file
    }

    fn delete_file(&self, url: &Url) -> Option<File> {
        let key = normalize_file_url(url);
        self.delete_file_with_key(&key)
    }

    fn delete_file_with_key(&self, key: &str) -> Option<File> {
        let file = *self.get_files().get(key)?;
        self.get_keys().remove(&file);
        self.get_files().remove(key);
        Some(file)
    }
}
