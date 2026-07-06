use std::cmp::Reverse;

use la_arena::{Arena, Idx};
use line_index::{TextRange, TextSize};
use sq_3_parser::SyntaxNodePtr;

use crate::{
    File, SymbolFlags, VScriptDatabase,
    db::source_symbol,
    symbol::{Primitive, Symbol, SymbolTable, Type},
};

pub trait ArenaId: Clone + Copy + PartialEq + Eq {
    type Data;
    fn file(&self) -> File;
    fn idx(&self) -> Idx<Self::Data>;
    fn get_data<'a>(&self, db: &'a dyn VScriptDatabase) -> &'a Self::Data;
}

macro_rules! arena_id {
    ($name:ident => $data:ty) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
        pub struct $name {
            file: File,
            idx: Idx<$data>,
        }

        impl $name {
            pub const fn new(file: File, idx: Idx<$data>) -> $name {
                Self { file, idx }
            }
        }

        impl ArenaId for $name {
            type Data = $data;

            fn file(&self) -> File {
                self.file
            }

            fn idx(&self) -> Idx<$data> {
                self.idx
            }

            fn get_data<'a>(&self, db: &'a dyn VScriptDatabase) -> &'a Self::Data {
                let source = source_symbol(db, self.file);
                &source.arena[self.idx]
            }
        }
    };
}

arena_id!(SymbolId => Symbol);
arena_id!(TableId => TableData);
arena_id!(ClassId => ClassData);
arena_id!(EnumId => EnumData);
arena_id!(FunctionId => FunctionData);
arena_id!(ArrayId => ArrayData);
arena_id!(StringLiteralId => StringLiteralData);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Container {
    Table(TableId),
    Enum(EnumId),
    // Both classes and instances take their members
    // from the same spot (outside of builtins). And
    // squirrel is bad enough to allow accessing non-static
    // members as a class and static members as an instance.
    // Solution: we normally resolve ignoring static and
    // non-static properties, however for completions we don't
    // show non-static members when accessing class
    // and vise versa (the constructor is always avoided)
    Class(ClassId),
    Instance(ClassId),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum ImportTarget {
    Table(TableId),
    Class(ClassId),
}

#[derive(Debug)]
pub enum TypeConversionError {
    WrongType,
    NotSpecific,
}

impl From<Container> for Type {
    fn from(value: Container) -> Self {
        match value {
            Container::Table(idx) => Self::Primitive(Primitive::Table(Some(idx))),
            Container::Class(idx) => Self::Primitive(Primitive::Class(Some(idx))),
            Container::Instance(idx) => Self::Primitive(Primitive::Instance(Some(idx))),
            Container::Enum(idx) => Self::Enum(idx),
        }
    }
}

impl TryFrom<Primitive> for Container {
    type Error = TypeConversionError;
    fn try_from(value: Primitive) -> Result<Self, Self::Error> {
        Ok(match value {
            Primitive::Table(id) => {
                let Some(id) = id else {
                    return Err(TypeConversionError::NotSpecific);
                };
                Self::Table(id)
            }
            Primitive::Class(id) | Primitive::Instance(id) => {
                let Some(id) = id else {
                    return Err(TypeConversionError::NotSpecific);
                };
                Self::Class(id)
            }
            _ => return Err(TypeConversionError::WrongType),
        })
    }
}

impl TryFrom<&Type> for Container {
    type Error = TypeConversionError;
    fn try_from(value: &Type) -> Result<Self, Self::Error> {
        value
            .find(|prim| Self::try_from(prim).ok())
            .ok_or(TypeConversionError::WrongType)
    }
}

impl TryFrom<Container> for ImportTarget {
    type Error = ();
    fn try_from(value: Container) -> Result<Self, Self::Error> {
        Ok(match value {
            Container::Table(id) => Self::Table(id),
            Container::Class(id) | Container::Instance(id) => Self::Class(id),
            Container::Enum(_) => return Err(()),
        })
    }
}

impl TryFrom<Primitive> for ImportTarget {
    type Error = TypeConversionError;
    fn try_from(value: Primitive) -> Result<Self, Self::Error> {
        Ok(match value {
            Primitive::Table(id) => {
                let Some(id) = id else {
                    return Err(TypeConversionError::NotSpecific);
                };
                Self::Table(id)
            }
            Primitive::Instance(id) | Primitive::Class(id) => {
                let Some(id) = id else {
                    return Err(TypeConversionError::NotSpecific);
                };
                Self::Class(id)
            }
            _ => return Err(TypeConversionError::WrongType),
        })
    }
}

impl TryFrom<&Type> for ImportTarget {
    type Error = TypeConversionError;
    fn try_from(value: &Type) -> Result<Self, Self::Error> {
        value
            .find(|prim| Self::try_from(prim).ok())
            .ok_or(TypeConversionError::WrongType)
    }
}

#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct TableData {
    pub delegate: Option<TableId>,
    pub members: SymbolTable,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct ClassData {
    pub symbol: Option<SymbolId>,
    pub inherits: Option<ClassId>,
    pub members: SymbolTable,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct EnumData {
    pub symbol: Option<SymbolId>,
    pub members: SymbolTable,
}

#[derive(Debug, Clone, PartialEq)]
pub struct FunctionData {
    pub symbol: Option<SymbolId>,
    pub range: TextRange,
    pub node: SyntaxNodePtr,
    // For inlay hints
    pub params_end: Option<TextSize>,
    pub ret: TypeState,
    pub container: Container,
    pub bindenv: Option<Container>,
    pub params: Vec<SymbolId>,
    pub params_state: ParamsState,
    pub yields: TypeState,
    pub throws: TypeState,
    pub flags: FunctionFlags,
}

bitflags::bitflags! {
    #[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
    pub struct FunctionFlags: u8 {
        // The function body has rerun and replaced this function id with another one
        const STALE = 1 << 0;
        const NO_DISCARD = 1 << 1;
    }
}

#[derive(Debug, Default, Clone, PartialEq)]
pub enum TypeState {
    #[default]
    Absent,
    NotExplicit(Type),
    Explicit(Type),
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub enum ParamsState {
    #[default]
    NoDefault,
    Default(usize),
    VarArgs(usize, SymbolId),
}

#[derive(Debug, PartialEq)]
pub struct ArrayData {
    pub kind: Type,
}

#[derive(Debug, PartialEq, Eq)]
pub struct StringLiteralData {
    pub text: Box<str>,
    pub range: TextRange,
    pub unquoted_range: TextRange,
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Scope {
    pub range: TextRange,
    pub locals: SymbolTable,
    pub parent: Option<Idx<Self>>,
    pub function: Option<Idx<FunctionData>>,
}

pub type ScopeId = Idx<Scope>;

pub trait ArenaAlloc<T> {
    fn alloc(&mut self, value: T) -> Idx<T>;
}

macro_rules! impl_source_arena {
    ($($field:ident: $data:ty),* $(,)?) => {
        #[derive(Debug, Default, PartialEq)]
        pub struct SourceArena {
            $($field: Arena<$data>,)*
        }

        $(
            impl std::ops::Index<Idx<$data>> for SourceArena {
                type Output = $data;
                fn index(&self, id: Idx<$data>) -> &$data {
                    &self.$field[id]
                }
            }

            impl std::ops::IndexMut<Idx<$data>> for SourceArena {
                fn index_mut(&mut self, id: Idx<$data>) -> &mut $data {
                    &mut self.$field[id]
                }
            }

            impl ArenaAlloc<$data> for SourceArena {
                fn alloc(&mut self, value: $data) -> Idx<$data> {
                    self.$field.alloc(value)
                }
            }
        )*
    };
}

impl_source_arena! {
    symbols:   Symbol,
    scopes:    Scope,
    tables:    TableData,
    classes:   ClassData,
    enums:     EnumData,
    functions: FunctionData,
    arrays:    ArrayData,
    strings:   StringLiteralData,
}

impl SourceArena {
    pub fn scope_at(&self, offset: TextSize) -> Idx<Scope> {
        self.scopes
            .iter()
            .filter(|(_, s)| s.range.contains_inclusive(offset))
            // Since the range can be equal (e.g. when we have a function that creates a scope with the size of its body)
            // the higher value of the index would serve as the tiebreaker since if range is equal then scope created later
            // is guaranteed to be deeper
            .min_by_key(|(i, s)| (s.range.len(), Reverse(*i)))
            .map(|(i, _)| i)
            .expect("Source scope should always contain any offset (unless it's out of bounds)")
        //.unwrap_or_default(Idx::from_raw(RawIdx::from(0 as u32)))
    }

    pub fn all_symbols(&self) -> impl Iterator<Item = (Idx<Symbol>, &Symbol)> {
        self.symbols
            .iter()
            .filter(|(_, s)| !s.flags.intersects(SymbolFlags::STALE))
    }

    pub fn all_functions(&self) -> impl Iterator<Item = (Idx<FunctionData>, &FunctionData)> {
        self.functions
            .iter()
            .filter(|(_, s)| !s.flags.intersects(FunctionFlags::STALE))
    }
}
