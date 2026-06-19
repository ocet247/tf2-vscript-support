use std::{
    path::{Path, PathBuf},
    sync::Arc,
    time::Instant,
};

use db::{BaseDatabase, DashMap, File, Url};
use rustc_hash::FxHashMap;
use salsa::Setter;
use sq_3_parser::Parse;

use crate::{
    Primitive, Source, SourceCtx, SourceSymbol, SymbolId, Type,
    arena::{ArenaId, FunctionId},
    resolver::Resolver,
    symbol::{FlatSymbolTable, to_flat_symbol_table},
};

#[salsa::db]
#[derive(Default, Clone)]
pub struct Database {
    storage: salsa::Storage<Self>,
    config: VScriptDbConfig,
    files: Arc<DashMap<Url, File>>,
    urls: Arc<DashMap<File, Url>>,
    builtins: Option<Arc<Builtins>>,
    tf2_root_url: Option<Url>,
    scripts_url: Option<Url>,
    squirrel_lib: Option<File>,
    vscript_lib: Option<File>,
    folded_lib: Option<File>,
    native_functions: Arc<FxHashMap<FunctionId, NativeFunction>>,
}

impl salsa::Database for Database {}
impl std::panic::RefUnwindSafe for Database {}

#[salsa::db]
impl BaseDatabase for Database {
    fn get_files(&self) -> &DashMap<Url, File> {
        &self.files
    }

    fn get_urls(&self) -> &DashMap<File, Url> {
        &self.urls
    }
}

#[derive(Debug, Clone)]
pub struct Builtin {
    pub symbol: SymbolId,
    pub members: FlatSymbolTable,
}

#[derive(Debug, Clone)]
pub struct Builtins {
    pub integer: Builtin,
    pub float: Builtin,
    pub boolean: Builtin,
    pub string: Builtin,
    pub array: Builtin,
    pub table: Builtin,
    pub function: Builtin,
    pub class: Builtin,
    pub instance: Builtin,
    pub generator: Builtin,
    pub thread: Builtin,
    pub weakref: Builtin,
    pub null: Builtin,
}

#[derive(Debug, Clone, Copy)]
pub enum NativeFunction {
    GetRootTable,
    GetConstTable,
    SetDelegate,
    Bindenv,
    NewThread,
    CopySelf,
    Array,
    ArrayExtend,
    ArrayReturnItem,
    // VScript
    IncludeScript,
    DoIncludeScript,
    CreateEntity,
    FindEntity,
}

#[salsa::db]
pub trait VScriptDatabase: BaseDatabase {
    fn builtins(&self) -> Option<&Builtins>;
    fn squirrel_lib(&self) -> Option<File>;
    fn vscript_lib(&self) -> Option<File>;
    fn folded_lib(&self) -> Option<File>;

    fn check_native(&self, id: FunctionId) -> Option<NativeFunction>;
    fn instance_from_vscript_lib(&self, text: &str) -> Option<Type>;

    fn config(&self) -> &VScriptDbConfig;
    fn update_config(&mut self, config: VScriptDbConfig);
    fn update_tf2_root(&mut self);

    /// # Errors
    /// If the script path is absent, has a bad extension, or can't be opened.
    fn get_script(&self, path: PathBuf) -> Result<File, String>;
    fn script_literals(&self) -> Vec<String>;
}

#[allow(clippy::unwrap_used, clippy::missing_panics_doc)]
#[salsa::db]
impl VScriptDatabase for Database {
    fn builtins(&self) -> Option<&Builtins> {
        self.builtins.as_deref()
    }

    fn squirrel_lib(&self) -> Option<File> {
        self.squirrel_lib
    }

    fn vscript_lib(&self) -> Option<File> {
        self.vscript_lib
    }

    fn folded_lib(&self) -> Option<File> {
        self.folded_lib
    }

    fn check_native(&self, id: FunctionId) -> Option<NativeFunction> {
        self.native_functions.get(&id).copied()
    }

    fn config(&self) -> &VScriptDbConfig {
        &self.config
    }

    fn update_config(&mut self, config: VScriptDbConfig) {
        if config.tf2_root_path == self.config.tf2_root_path {
            self.config = config;
        } else {
            self.config = config;
            self.update_tf2_root();
        }
    }

    fn update_tf2_root(&mut self) {
        let Some(root) = self
            .config
            .tf2_root_path
            .as_ref()
            .and_then(|r| r.canonicalize().ok())
        else {
            self.tf2_root_url = None;
            self.scripts_url = None;
            return;
        };

        let scripts = root.join("tf/scripts/vscripts");
        if scripts.exists() {
            self.load_all_scripts(&scripts);
            self.scripts_url = Url::from_directory_path(&scripts).ok();
        } else {
            self.scripts_url = None;
        }

        self.tf2_root_url = Url::from_directory_path(&root).ok();
    }

    fn get_script(&self, mut path: PathBuf) -> Result<File, String> {
        let scripts = self.scripts_url.as_ref().ok_or_else(|| {
            if self.tf2_root_url.is_some() {
                "Specified TF2 root path contains no 'tf/scripts/vscripts' directory".to_owned()
            } else {
                "No TF2 root specified".to_owned()
            }
        })?;

        if path.extension().is_none() {
            path.set_extension("nut");
        } else if path.extension().and_then(|e| e.to_str()) != Some("nut") {
            return Err("Script path must either have no or '.nut' extension".to_owned());
        }

        if path.is_absolute() {
            return Err(format!(
                "Script path must be relative to '{}'",
                scripts.as_str()
            ));
        }

        let url = scripts
            .join(path.to_str().ok_or("Script path is not valid UTF-8")?)
            .map_err(|e| format!("Couldn't construct script URL: {e}"))?;

        if let Some(file) = self.get_file(&url) {
            return Ok(file);
        }

        let full_path = url
            .to_file_path()
            .map_err(|()| format!("Couldn't convert '{url}' to path"))?;

        let text =
            std::fs::read_to_string(&full_path).map_err(|_| "File does not exist".to_owned())?;

        Ok(self.open_file(&url, text))
    }

    fn script_literals(&self) -> Vec<String> {
        let Some(scripts) = &self.scripts_url else {
            return Vec::new();
        };
        let scripts_str = scripts.as_str();

        self.get_files()
            .iter()
            .filter_map(|entry| {
                let url = entry.key().as_str();
                let rel = url.strip_prefix(scripts_str)?;

                if !std::path::Path::new(rel)
                    .extension()
                    .is_some_and(|ext| ext.eq_ignore_ascii_case("nut"))
                {
                    return None;
                }

                Some(rel.trim_end_matches(".nut").to_owned())
            })
            .collect()
    }

    fn instance_from_vscript_lib(&self, class: &str) -> Option<Type> {
        let vscript_lib = self.vscript_lib()?;

        let symbol = self.find_symbol(vscript_lib, &[class])?;
        let typ = &symbol.get_data(self).typ;

        let Ok(id) = typ.to_class() else {
            log::warn!("Trying to get type of '{class}' but it doesn't point to a class");
            return None;
        };

        Some(Type::Primitive(Primitive::Instance(Some(id))))
    }
}

#[derive(Debug, Default, Clone)]
pub struct VScriptDbInitConfig {
    pub std_lib_path: Option<PathBuf>,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum UnusedVariables {
    Warn,
    #[default]
    Hint,
    Off,
}

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum UnreachableCode {
    #[default]
    Warn,
    Hint,
    Off,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Debug, Default, Clone)]
pub struct VScriptDbConfig {
    pub tf2_root_path: Option<PathBuf>,
    pub unused_variables: UnusedVariables,
    pub unreachable_code: UnreachableCode,
    pub type_hints: bool,
    pub parameter_hints: bool,
    pub enum_member_value_hints: bool,
    pub return_value_hints: bool,
    pub workspace_diagnostics: bool,
}

impl Database {
    #[must_use]
    pub fn new(config: VScriptDbInitConfig) -> Self {
        let mut this = Self::default();

        let mut native_functions = FxHashMap::default();
        let Some(path) = config.std_lib_path else {
            log::error!("Missing stdLibPath initialization option");
            return this;
        };

        let Ok(path) = path.canonicalize() else {
            log::error!(
                "Standard library directory '{}' couldn't be resolved",
                path.display()
            );
            return this;
        };

        match this.init_builtins(&path.join("builtins.nut")) {
            Some(builtins) => this.fill_builtins_native_functions(builtins, &mut native_functions),
            None => log::error!("Missing 'builtins.nut' in the standard library directory"),
        }

        match this.init_stdlib_file(&path.join("squirrel.nut")) {
            Some(lib) => {
                this.squirrel_lib = Some(lib);
                this.fill_squirrel_native_functions(lib, &mut native_functions);
            }
            None => log::error!("Missing 'squirrel.nut' in the standard library directory"),
        }

        match this.init_stdlib_file(&path.join("vscript.nut")) {
            Some(lib) => {
                this.vscript_lib = Some(lib);
                this.fill_vscript_native_functions(lib, &mut native_functions);
            }
            None => log::error!("Missing 'vscript.nut' in the standard library directory"),
        }

        this.native_functions = Arc::new(native_functions);

        match this.init_stdlib_file(&path.join("folded.nut")) {
            Some(file) => this.folded_lib = Some(file),
            None => log::error!("Missing 'folded.nut' in the standard library directory"),
        }

        this
    }

    fn load_all_scripts(&self, scripts_dir: &PathBuf) {
        for entry in walkdir::WalkDir::new(scripts_dir)
            .into_iter()
            .filter_map(std::result::Result::ok)
            .filter(|e| e.path().extension().and_then(|e| e.to_str()) == Some("nut"))
        {
            let path = entry.into_path();
            let Ok(path) = path.canonicalize() else {
                continue;
            };

            let Ok(url) = Url::from_file_path(&path) else {
                continue;
            };
            if self.get_file(&url).is_some() {
                continue;
            }
            let Ok(text) = std::fs::read_to_string(&path) else {
                continue;
            };
            self.open_file(&url, text);
        }
    }

    /// Converts a `&Path` to a URL and opens the file.
    /// Used only during init where we receive `PathBuf` from config.
    fn open_file_from_path(&self, path: &Path) -> Option<File> {
        let path = path.canonicalize().ok()?;
        let url = Url::from_file_path(&path).ok()?;

        if let Some(file) = self.get_file(&url) {
            return Some(file);
        }

        let text = std::fs::read_to_string(&path).ok()?;
        Some(self.open_file(&url, text))
    }

    fn init_builtins(&mut self, path: &Path) -> Option<File> {
        let builtins = self.open_file_from_path(path)?;
        builtins
            .set_text(self)
            .with_durability(salsa::Durability::HIGH);

        self.builtins = Some(Arc::new(Builtins {
            integer: self.init_builtin(builtins, "integer"),
            float: self.init_builtin(builtins, "float"),
            boolean: self.init_builtin(builtins, "bool"),
            string: self.init_builtin(builtins, "string"),
            array: self.init_builtin(builtins, "array"),
            table: self.init_builtin(builtins, "table"),
            function: self.init_builtin(builtins, "function_"),
            class: self.init_builtin(builtins, "class_"),
            instance: self.init_builtin(builtins, "instance"),
            generator: self.init_builtin(builtins, "generator"),
            thread: self.init_builtin(builtins, "thread"),
            weakref: self.init_builtin(builtins, "weakref"),
            null: self.init_builtin(builtins, "null_"),
        }));

        Some(builtins)
    }

    fn init_builtin(&self, file: File, name: &'static str) -> Builtin {
        let symbol = self
            .find_symbol(file, &[name])
            .unwrap_or_else(|| panic!("Builtin '{name}' not found"));

        let source = source_symbol(self, file);
        let typ = &source.arena[symbol.idx()].typ;

        let Ok(id) = typ.to_class() else {
            panic!("'{name}' member is not of type 'class', {typ:?}");
        };

        Builtin {
            symbol,
            members: to_flat_symbol_table(id.get_data(self).members.clone()),
        }
    }

    fn fill_builtins_native_functions(
        &self,
        builtins: File,
        map: &mut FxHashMap<FunctionId, NativeFunction>,
    ) {
        for (native_function, sym_path) in [
            (
                NativeFunction::SetDelegate,
                ["table", "setdelegate"].as_slice(),
            ),
            (NativeFunction::Bindenv, ["function_", "bindenv"].as_slice()),
            (NativeFunction::ArrayExtend, ["array", "extend"].as_slice()),
            (NativeFunction::ArrayReturnItem, ["array", "pop"].as_slice()),
            (
                NativeFunction::ArrayReturnItem,
                ["array", "remove"].as_slice(),
            ),
            (NativeFunction::CopySelf, ["array", "filter"].as_slice()),
            (NativeFunction::CopySelf, ["array", "map"].as_slice()),
            (NativeFunction::CopySelf, ["array", "slice"].as_slice()),
        ] {
            let Some(symbol) = self.find_symbol(builtins, sym_path) else {
                continue;
            };

            let Ok(function_id) = source_symbol(self, builtins).arena[symbol.idx()]
                .typ
                .to_function()
            else {
                log::warn!(
                    "Standard library symbol '{sym_path:?}' has a wrong type. (Expected 'function')"
                );
                continue;
            };

            map.insert(function_id, native_function);
        }
    }

    fn init_stdlib_file(&mut self, path: &Path) -> Option<File> {
        let lib = self.open_file_from_path(path)?;
        lib.set_text(self).with_durability(salsa::Durability::HIGH);
        Some(lib)
    }

    fn fill_squirrel_native_functions(
        &self,
        lib: File,
        map: &mut FxHashMap<FunctionId, NativeFunction>,
    ) {
        for (native_function, sym_path) in [
            (NativeFunction::Array, ["array"].as_slice()),
            (NativeFunction::NewThread, ["newthread"].as_slice()),
            (NativeFunction::GetRootTable, ["getroottable"].as_slice()),
            (NativeFunction::GetConstTable, ["getconsttable"].as_slice()),
        ] {
            let Some(symbol) = self.find_symbol(lib, sym_path) else {
                continue;
            };

            let Ok(id) = source_symbol(self, lib).arena[symbol.idx()]
                .typ
                .to_function()
            else {
                log::warn!(
                    "Standard library symbol '{sym_path:?}' has a wrong type. (Expected 'function')"
                );
                continue;
            };

            map.insert(id, native_function);
        }
    }

    fn fill_vscript_native_functions(
        &self,
        lib: File,
        map: &mut FxHashMap<FunctionId, NativeFunction>,
    ) {
        for (native_function, sym_path) in [
            (NativeFunction::IncludeScript, ["IncludeScript"].as_slice()),
            (
                NativeFunction::DoIncludeScript,
                ["DoIncludeScript"].as_slice(),
            ),
            (
                NativeFunction::CreateEntity,
                ["SpawnEntityFromTable"].as_slice(),
            ),
            (NativeFunction::CreateEntity, ["CreateProp"].as_slice()),
            (
                NativeFunction::CreateEntity,
                ["CEntities", "CreateByClassname"].as_slice(),
            ),
            (
                NativeFunction::FindEntity,
                ["CEntities", "FindByClassname"].as_slice(),
            ),
            (
                NativeFunction::FindEntity,
                ["CEntities", "FindByClassnameNearest"].as_slice(),
            ),
            (
                NativeFunction::FindEntity,
                ["CEntities", "FindByClassnameWithin"].as_slice(),
            ),
        ] {
            let Some(symbol) = self.find_symbol(lib, sym_path) else {
                continue;
            };

            let Ok(id) = source_symbol(self, lib).arena[symbol.idx()]
                .typ
                .to_function()
            else {
                log::warn!(
                    "Standard library symbol '{sym_path:?}' has a wrong type. (Expected 'function')"
                );
                continue;
            };

            map.insert(id, native_function);
        }
    }

    fn find_symbol(&self, file: File, path: &[&str]) -> Option<SymbolId> {
        let source = source_symbol(self, file);

        let mut last: Option<SymbolId> = None;
        'inner: for part in path {
            let members = match last {
                Some(id) => {
                    let Ok(class_id) = source.arena[id.idx()].typ.to_class() else {
                        log::warn!(
                            "Symbol '{}' in '{path:?}' is not of type 'class'",
                            source.arena[id.idx()].name
                        );
                        return None;
                    };
                    if class_id.file() != file {
                        log::warn!("Standard library symbol in '{path:?}' is defined externally");
                        return None;
                    }
                    &source.arena[class_id.idx()].members
                }
                None => &source.arena[source.source_table].members,
            };

            for (name, ids) in members {
                if name.as_ref() != *part {
                    continue;
                }

                if ids.len() > 1 {
                    log::warn!("Multiple definitions for the standard library symbol '{name}'");
                }

                let id = ids
                    .last()
                    .expect("SymbolTable vector contains at least 1 symbol");

                if id.file() != file {
                    log::warn!("Standard library symbol '{name}' is defined externally");
                    return None;
                }

                last = Some(*id);
                continue 'inner;
            }

            log::warn!("Couldn't find '{part}' in '{path:?}'");
            return None;
        }

        last
    }
}

#[salsa::tracked(returns(ref))]
pub fn parse(db: &dyn BaseDatabase, file: File) -> Parse {
    let now = Instant::now();
    log::info!("Started parsing");
    let result = Parse::new(file.text(db));
    log::info!("Parsing took {:?}", now.elapsed());
    result
}

#[salsa::tracked(returns(ref))]
pub fn source_symbol(db: &dyn VScriptDatabase, file: File) -> SourceSymbol {
    let now = Instant::now();
    log::info!("Started source symbol");
    let p = parse(db, file);
    let source = Resolver::symbol_from_source_file(db, file, &p.source_file());
    log::info!("Source symbol took {:?}", now.elapsed());
    source
}

#[salsa::tracked]
pub fn top_root_members(db: &dyn VScriptDatabase, file: File) -> FlatSymbolTable {
    let ctx = SourceCtx::new(db, file);
    to_flat_symbol_table(ctx.additional_table_members(ctx.root_table()))
}

#[salsa::tracked]
pub fn top_source_members(db: &dyn VScriptDatabase, file: File) -> FlatSymbolTable {
    let ctx = SourceCtx::new(db, file);
    to_flat_symbol_table(ctx.additional_table_members(ctx.source_table()))
}

#[salsa::tracked]
pub fn top_const_members(db: &dyn VScriptDatabase, file: File) -> FlatSymbolTable {
    let ctx = SourceCtx::new(db, file);
    to_flat_symbol_table(ctx.additional_table_members(ctx.const_table()))
}

#[salsa::tracked]
pub fn top_source_and_root_members(db: &dyn VScriptDatabase, file: File) -> FlatSymbolTable {
    top_source_members(db, file)
        .into_iter()
        .chain(top_root_members(db, file))
        .collect()
}

#[salsa::tracked]
pub fn top_source_and_const_members(db: &dyn VScriptDatabase, file: File) -> FlatSymbolTable {
    top_source_members(db, file)
        .into_iter()
        .chain(top_const_members(db, file))
        .collect()
}
