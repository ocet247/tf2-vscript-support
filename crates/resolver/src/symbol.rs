use std::sync::Arc;

use rustc_hash::FxHashMap;
use sq_3_parser::{SyntaxNodePtr, TextRange};
use string_literals::StringLiteralValues;

use crate::arena::{
    ArrayId, ClassId, EnumId, FunctionId, GeneratorId, StringLiteralId, SymbolId, TableId,
};

macro_rules! primitive_accessor {
    (
        $name:ident,
        $flag:ident,
        $ret:ty,
        $pattern:pat => $value:expr
    ) => {
        /// # Errors
        /// If the information couldn't be extracted
        pub fn $name(&self) -> Result<$ret, ToPrimitiveError> {
            let flags = self.type_flags();
            if !flags.intersects(TypeFlags::$flag) {
                return Err(if flags.intersects(TypeFlags::ANY) {
                    ToPrimitiveError::WrongTypeWithAny
                } else {
                    ToPrimitiveError::WrongType
                });
            }

            self.find(|p| if let $pattern = p { $value } else { None })
                .ok_or(ToPrimitiveError::NotSpecific)
        }
    };
}

#[derive(Debug, PartialEq, Clone)]
pub struct Symbol {
    pub name: Box<str>,
    pub node: SyntaxNodePtr,
    pub name_range: TextRange,
    pub typ: Type,
    pub is_type_explicit: bool,
    pub kind: SymbolKind,
    pub description: Option<String>,
    pub flags: SymbolFlags,
}

bitflags::bitflags! {
    #[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
    pub struct SymbolFlags: u8 {
        const CONST = 1 << 1;
        const STATIC = 1 << 2;
        const HIDE = 1 << 3;
        const DEPRECATED = 1 << 4;
    }
}

impl Symbol {
    #[must_use]
    pub const fn is_modifiable(&self) -> bool {
        match self.kind {
            SymbolKind::Local(_) | SymbolKind::Property { .. } => {
                !self.flags.intersects(SymbolFlags::CONST)
            }
            _ => false,
        }
    }
}

/// Maps name to multiple symbols
///
/// To represent multiple symbols with the same name
/// we use a vector instead of 1 to 1 mapping
/// this complicated API quite a bit since we need to
/// pass current execution range and offset whenever
/// we want a specific symbol but properly represents
/// what is actually happening in the source file
pub type SymbolTable = FxHashMap<Box<str>, Vec<SymbolId>>;

/// Maps name to a single symbol
///
/// This is used in `members_of_type` where it's possible to flatten the table
pub type FlatSymbolTable = FxHashMap<Box<str>, SymbolId>;

pub fn insert_symbol(table: &mut SymbolTable, name: Box<str>, value: SymbolId) {
    table
        .entry(name)
        .and_modify(|entry| entry.push(value))
        .or_insert_with(|| vec![value]);
}

pub fn to_flat_symbol_table(table: SymbolTable) -> FlatSymbolTable {
    table
        .into_iter()
        .map(|(name, ids)| {
            (
                name,
                *ids.last().expect(
                    "Symbol table vector is guaranteed to contain at least a single symbol",
                ),
            )
        })
        .collect()
}

#[derive(Debug, Clone, PartialEq)]
pub enum Type {
    Primitive(Primitive),
    Enum(EnumId),
    Union(Union),
}

impl Default for Type {
    fn default() -> Self {
        Self::Primitive(Primitive::default())
    }
}

pub enum DisplayType {
    Function,
    Class,
    Variable,
    Constant,
    Field,
    Enum,
    EnumMember,
}

impl From<&Symbol> for DisplayType {
    fn from(value: &Symbol) -> Self {
        match &value.typ {
            Type::Enum(_) => Self::Enum,
            typ => match Primitive::try_from(typ) {
                Ok(Primitive::Class(_)) => Self::Class,
                Ok(Primitive::Function(_)) => Self::Function,
                _ => match value.kind {
                    SymbolKind::SignatureParameter | SymbolKind::Local(_) => Self::Variable,
                    SymbolKind::Constant => Self::Constant,
                    SymbolKind::Property { .. } => Self::Field,
                    SymbolKind::EnumMember => Self::EnumMember,
                },
            },
        }
    }
}

impl TryFrom<&Type> for Primitive {
    type Error = ();
    fn try_from(value: &Type) -> Result<Self, Self::Error> {
        match value {
            Type::Union(union) => {
                let mut new = union
                    .primitives
                    .iter()
                    .filter(|prim| !matches!(prim, Self::Null | Self::Any))
                    .copied();

                new.next()
                    .and_then(|first| new.next().is_none().then_some(first))
                    .ok_or(())
            }
            Type::Primitive(prim) => Ok(*prim),
            Type::Enum(_) => Err(()),
        }
    }
}

pub enum ToPrimitiveError {
    WrongType,
    WrongTypeWithAny,
    NotSpecific,
}

impl Type {
    #[must_use]
    pub const fn type_flags(&self) -> TypeFlags {
        match self {
            Self::Enum(_) => TypeFlags::empty(),
            Self::Primitive(prim) => prim.type_flags(),
            Self::Union(union) => union.flags,
        }
    }

    pub fn find<T, U>(&self, func: T) -> Option<U>
    where
        T: Fn(Primitive) -> Option<U>,
    {
        match self {
            Self::Enum(_) => None,
            Self::Union(union) => union.primitives.iter().find_map(|p| func(*p)),
            Self::Primitive(prim) => func(*prim),
        }
    }

    pub fn find_with_filter<T, U, V>(&self, func: T, filter: V) -> Option<U>
    where
        T: Fn(Primitive) -> Option<U>,
        V: Fn(Primitive) -> bool,
    {
        match self {
            Self::Enum(_) => None,
            Self::Union(union) => union
                .primitives
                .iter()
                .filter(|p| filter(**p))
                .find_map(|p| func(*p)),
            Self::Primitive(prim) => func(*prim),
        }
    }

    #[must_use]
    pub fn add_any(&self) -> Self {
        merge_types(self, &Self::ANY)
    }

    #[must_use]
    pub fn add_null(&self) -> Self {
        merge_types(self, &Self::NULL)
    }

    #[must_use]
    pub fn remove_this(&self) -> Option<Self> {
        match self {
            Self::Primitive(prim) => (*prim != Primitive::This).then_some(Self::Primitive(*prim)),
            Self::Enum(enum_id) => Some(Self::Enum(*enum_id)),
            Self::Union(union) => {
                let new: Vec<_> = union
                    .primitives
                    .iter()
                    .copied()
                    .filter(|p| *p != Primitive::This)
                    .collect();
                let flags = union.flags.difference(TypeFlags::THIS);
                Some(Self::Union(Union {
                    flags,
                    primitives: new.into(),
                }))
            }
        }
    }

    #[must_use]
    pub fn this_to_concrete(&self, this: &Self) -> Self {
        if self.type_flags().intersects(TypeFlags::THIS) {
            self.remove_this()
                .map_or_else(|| this.clone(), |typ| merge_types(this, &typ))
        } else {
            self.clone()
        }
    }

    #[must_use]
    pub const fn is_useful(&self) -> bool {
        !TypeFlags::ANY_OR_NULL.contains(self.type_flags())
    }

    #[must_use]
    pub const fn null_to_any(&self) -> &Self {
        if self.is_useful() { self } else { &Self::ANY }
    }

    primitive_accessor!(
        to_string,
        STRING,
        (StringKind, Option<StringLiteralId>),
        Primitive::String { kind, literal } => Some((kind, literal))
    );

    primitive_accessor!(
        to_function,
        FUNCTION,
        FunctionId,
        Primitive::Function(id) => id
    );

    primitive_accessor!(
        to_table,
        TABLE,
        TableId,
        Primitive::Table(id) => id
    );

    primitive_accessor!(
        to_class,
        CLASS,
        ClassId,
        Primitive::Class(id) => id
    );

    primitive_accessor!(
        to_instance,
        INSTANCE,
        ClassId,
        Primitive::Instance(id) => id
    );

    primitive_accessor!(
        to_array,
        ARRAY,
        ArrayId,
        Primitive::Array(id) => id
    );

    primitive_accessor!(
        to_generator,
        GENERATOR,
        GeneratorId,
        Primitive::Generator(id) => id
    );

    pub const ANY: Self = Self::Primitive(Primitive::Any);
    pub const INTEGER: Self = Self::Primitive(Primitive::Integer(None));
    pub const FLOAT: Self = Self::Primitive(Primitive::Float(None));
    pub const STRING: Self = Self::Primitive(Primitive::String {
        kind: StringKind::Arbitrary,
        literal: None,
    });
    pub const BOOL: Self = Self::Primitive(Primitive::Bool(None));
    pub const NULL: Self = Self::Primitive(Primitive::Null);
    pub const INSTANCE: Self = Self::Primitive(Primitive::Instance(None));
    pub const ARRAY: Self = Self::Primitive(Primitive::Array(None));
    pub const TABLE: Self = Self::Primitive(Primitive::Table(None));
    pub const CLASS: Self = Self::Primitive(Primitive::Class(None));
    pub const FUNCTION: Self = Self::Primitive(Primitive::Function(None));
    pub const GENERATOR: Self = Self::Primitive(Primitive::Generator(None));
    pub const THREAD: Self = Self::Primitive(Primitive::Thread(None));
    pub const WEAKREF: Self = Self::Primitive(Primitive::Weakref);
    pub const THIS: Self = Self::Primitive(Primitive::This);
}

/// Single type
///
/// options here basically mean: we know it would be this type
/// but we don't really know what is the exact data behind it
/// for instances tables with different keys, or
/// instances coming from different classes.
/// It's better to use None here rather than to turn everything
/// into Any since we at least can get partial completions
/// and operations
#[derive(Debug, Default, Clone, Copy, PartialEq)]
pub enum Primitive {
    #[default]
    Any,
    Integer(Option<i32>),
    Float(Option<f32>),
    String {
        kind: StringKind,
        literal: Option<StringLiteralId>,
    },
    Bool(Option<bool>),
    Null,
    Instance(Option<ClassId>),
    Array(Option<ArrayId>),
    Table(Option<TableId>),
    Class(Option<ClassId>),
    Function(Option<FunctionId>),
    Generator(Option<GeneratorId>),
    Thread(Option<FunctionId>),
    Weakref,
    This,
    // Signature(Option<SignatureId>),
}

impl Primitive {
    #[must_use]
    pub const fn type_flags(&self) -> TypeFlags {
        match self {
            Self::Any => TypeFlags::ANY,
            Self::Integer(_) => TypeFlags::INTEGER,
            Self::Float(_) => TypeFlags::FLOAT,
            Self::String { .. } => TypeFlags::STRING,
            Self::Bool(_) => TypeFlags::BOOL,
            Self::Null => TypeFlags::NULL,
            Self::Instance(_) => TypeFlags::INSTANCE,
            Self::Array(_) => TypeFlags::ARRAY,
            Self::Table(_) => TypeFlags::TABLE,
            Self::Class(_) => TypeFlags::CLASS,
            Self::Function(_) => TypeFlags::FUNCTION,
            Self::Generator(_) => TypeFlags::GENERATOR,
            Self::Thread(_) => TypeFlags::THREAD,
            Self::Weakref => TypeFlags::WEAKREF,
            Self::This => TypeFlags::THIS,
        }
    }
}

#[derive(Debug, Default, Clone, PartialEq)]
pub struct Union {
    pub flags: TypeFlags,
    pub primitives: Arc<[Primitive]>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SymbolKind {
    Local(LocalKind),
    Constant,
    EnumMember,
    Property { show_inlay_hint: bool },
    SignatureParameter,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LocalKind {
    Variable,
    Function,
    Parameter,
    VariedArgs,
    Exception,
    Embedded,
}

impl Default for SymbolKind {
    fn default() -> Self {
        Self::Property {
            show_inlay_hint: false,
        }
    }
}

bitflags::bitflags! {
    #[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
    pub struct TypeFlags: u16 {
        const ANY = 1 << 0;
        const NULL = 1 << 1;
        const INTEGER = 1 << 2;
        const FLOAT = 1 << 3;
        const STRING = 1 << 4;
        const BOOL = 1 << 5;
        const INSTANCE = 1 << 6;
        const ARRAY = 1 << 7;
        const TABLE = 1 << 8;
        const CLASS = 1 << 9;
        const FUNCTION = 1 << 10;
        const GENERATOR = 1 << 11;
        const THREAD = 1 << 12;
        const WEAKREF = 1 << 13;
        const THIS = 1 << 14;
    }
}

impl TypeFlags {
    pub const ANY_OR_NULL: Self = Self::ANY.union(Self::NULL);

    pub const NUMBER: Self = Self::INTEGER.union(Self::FLOAT);
    pub const NUMBER_OR_ANY: Self = Self::NUMBER.union(Self::ANY);

    pub const ARRAY_OR_STRING: Self = Self::ARRAY.union(Self::STRING);

    pub const INSTANCE_OR_ANY: Self = Self::INSTANCE.union(Self::ANY);
    pub const CLASS_OR_ANY: Self = Self::CLASS.union(Self::ANY);

    pub const TABLE_OR_INSTANCE: Self = Self::TABLE.union(Self::INSTANCE);

    pub const HAS_MEMBERS: Self = Self::CLASS.union(Self::TABLE).union(Self::INSTANCE);

    pub const HAS_MEMBERS_OR_ANY: Self = Self::HAS_MEMBERS.union(Self::ANY);

    pub const CAN_COMPARE: Self = Self::NULL
        .union(Self::FLOAT)
        .union(Self::INTEGER)
        .union(Self::BOOL)
        .union(Self::STRING)
        .union(Self::TABLE)
        .union(Self::INSTANCE);

    pub const ARITHMETIC: Self = Self::NUMBER.union(Self::TABLE).union(Self::INSTANCE);

    pub const VALID_DISCRIMINANT: Self = Self::NULL
        .union(Self::FLOAT)
        .union(Self::NUMBER)
        .union(Self::BOOL)
        .union(Self::STRING)
        .union(Self::ANY);
}

pub fn merge_primitives(left: Primitive, right: Primitive) -> Option<Primitive> {
    if left == right {
        return Some(left);
    }

    Some(match (left, right) {
        (Primitive::Integer(_), Primitive::Integer(_)) => Primitive::Integer(None),
        (Primitive::Float(_), Primitive::Float(_)) => Primitive::Float(None),
        (Primitive::Bool(_), Primitive::Bool(_)) => Primitive::Bool(None),
        (Primitive::String { .. }, Primitive::String { .. }) => Primitive::String {
            kind: StringKind::Arbitrary,
            literal: None,
        },

        (Primitive::Instance(Some(left_id)), Primitive::Instance(Some(right_id))) => {
            return (left_id == right_id).then_some(left);
        }
        (Primitive::Instance(_), Primitive::Instance(_)) => Primitive::Instance(None),
        (Primitive::Table(_), Primitive::Table(_)) => Primitive::Table(None),
        (Primitive::Class(_), Primitive::Class(_)) => Primitive::Class(None),
        (Primitive::Array(_), Primitive::Array(_)) => Primitive::Array(None),
        (Primitive::Function(_), Primitive::Function(_)) => Primitive::Function(None),
        (Primitive::Generator(_), Primitive::Generator(_)) => Primitive::Generator(None),
        (Primitive::Thread(_), Primitive::Thread(_)) => Primitive::Thread(None),
        (_, _) => {
            return None;
        }
    })
}

pub fn merge_types(left: &Type, right: &Type) -> Type {
    match (left, right) {
        (Type::Enum(_), other) | (other, Type::Enum(_)) => other.clone(),
        (Type::Union(left), Type::Union(right)) => {
            let mut primitives = Vec::new();
            let mut right_used = vec![false; right.primitives.len()];

            for left in left.primitives.iter() {
                let mut merged = false;

                for (i, right) in right.primitives.iter().enumerate() {
                    if right_used[i] {
                        continue;
                    }

                    if let Some(new_type) = merge_primitives(*left, *right) {
                        primitives.push(new_type);
                        right_used[i] = true;
                        merged = true;
                        break;
                    }
                }

                if !merged {
                    primitives.push(*left);
                }
            }

            // Add remaining right-side types
            for (i, right) in right.primitives.iter().enumerate() {
                if !right_used[i] {
                    primitives.push(*right);
                }
            }

            Type::Union(Union {
                primitives: primitives.into(),
                flags: left.flags | right.flags,
            })
        }

        (Type::Primitive(other), Type::Union(union))
        | (Type::Union(union), Type::Primitive(other)) => {
            let mut primitives = Vec::new();
            let mut iter = union.primitives.iter();
            let flags = union.flags | other.type_flags();

            while let Some(typ) = iter.next() {
                let Some(merged_type) = merge_primitives(*typ, *other) else {
                    primitives.push(*typ);
                    continue;
                };

                primitives.push(merged_type);
                // After we've successfully merged the required type just extend the list
                // with the remaining types from the iterator
                primitives.extend(iter);
                return Type::Union(Union {
                    flags,
                    primitives: primitives.into(),
                });
            }
            // No merge was successful -> just add a new type to the end of the list
            primitives.push(*other);
            Type::Union(Union {
                flags,
                primitives: primitives.into(),
            })
        }
        (Type::Primitive(left), Type::Primitive(right)) => {
            if let Some(typ) = merge_primitives(*left, *right) {
                return Type::Primitive(typ);
            }

            let primitives = Arc::new([*left, *right]);
            let flags = left.type_flags() | right.type_flags();

            Type::Union(Union { flags, primitives })
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StringKind {
    Arbitrary,

    Script,

    Attribute,

    Input,
    Output,
    Classname,
    ClassnameSearch,

    Convar,
    ClientConvar,

    PropInt,
    PropIntArray,
    PropFloat,
    PropFloatArray,
    PropEntity,
    PropEntityArray,
    PropBool,
    PropBoolArray,
    PropString,
    PropStringArray,
    PropVector,
    PropVectorArray,
    PropAll,
    PropArray,
}

impl std::fmt::Display for StringKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Arbitrary => write!(f, "arbitrary"),
            Self::Script => write!(f, "script"),
            Self::Attribute => write!(f, "attribute"),
            Self::Input => write!(f, "input"),
            Self::Output => write!(f, "output"),
            Self::Classname => write!(f, "classname"),
            Self::ClassnameSearch => write!(f, "classname_search"),
            Self::Convar => write!(f, "convar"),
            Self::ClientConvar => write!(f, "client_convar"),
            Self::PropInt => write!(f, "integer_property"),
            Self::PropIntArray => write!(f, "integer_array_property"),
            Self::PropFloat => write!(f, "float_property"),
            Self::PropFloatArray => write!(f, "float_array_property"),
            Self::PropEntity => write!(f, "entity_property"),
            Self::PropEntityArray => write!(f, "entity_array_property"),
            Self::PropBool => write!(f, "bool_property"),
            Self::PropBoolArray => write!(f, "bool_array_property"),
            Self::PropString => write!(f, "string_property"),
            Self::PropStringArray => write!(f, "string_array_property"),
            Self::PropVector => write!(f, "vector_property"),
            Self::PropVectorArray => write!(f, "vector_array_property"),
            Self::PropAll => write!(f, "property"),
            Self::PropArray => write!(f, "array_property"),
        }
    }
}

impl std::str::FromStr for StringKind {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Ok(match s {
            "script" => Self::Script,
            "attribute" => Self::Attribute,
            "input" => Self::Input,
            "output" => Self::Output,
            "classname" => Self::Classname,
            "classname_search" => Self::ClassnameSearch,
            "convar" => Self::Convar,
            "client_convar" => Self::ClientConvar,
            "integer_property" => Self::PropInt,
            "integer_array_property" => Self::PropIntArray,
            "float_property" => Self::PropFloat,
            "float_array_property" => Self::PropFloatArray,
            "entity_property" => Self::PropEntity,
            "entity_array_property" => Self::PropEntityArray,
            "bool_property" => Self::PropBool,
            "bool_array_property" => Self::PropBoolArray,
            "string_property" => Self::PropString,
            "string_array_property" => Self::PropStringArray,
            "vector_property" => Self::PropVector,
            "vector_array_property" => Self::PropVectorArray,
            "property" => Self::PropAll,
            "property_array" => Self::PropArray,
            _ => return Err(()),
        })
    }
}

impl StringKind {
    #[must_use]
    pub fn values(self) -> Option<&'static [&'static StringLiteralValues]> {
        use string_literals as sl;

        Some(match self {
            Self::Arbitrary | Self::Script => return None,
            Self::Attribute => &sl::ATTRIBUTE,
            Self::Input => &sl::INPUT,
            Self::Output => &sl::OUTPUT,
            Self::Classname | Self::ClassnameSearch => &sl::CLASSNAME,
            Self::Convar => &sl::CONVAR,
            Self::ClientConvar => &sl::CLIENT_CONVAR,
            Self::PropInt => &sl::PROPERTY_INTEGER,
            Self::PropIntArray => &sl::PROPERTY_INTEGER_ARRAY,
            Self::PropFloat => &sl::PROPERTY_FLOAT,
            Self::PropFloatArray => &sl::PROPERTY_FLOAT_ARRAY,
            Self::PropEntity => &sl::PROPERTY_ENTITY,
            Self::PropEntityArray => &sl::PROPERTY_ENTITY_ARRAY,
            Self::PropBool => &sl::PROPERTY_BOOL,
            Self::PropBoolArray => &sl::PROPERTY_BOOL_ARRAY,
            Self::PropString => &sl::PROPERTY_STRING,
            Self::PropStringArray => &sl::PROPERTY_STRING_ARRAY,
            Self::PropVector => &sl::PROPERTY_VECTOR,
            Self::PropVectorArray => &sl::PROPERTY_VECTOR_ARRAY,
            Self::PropAll => &sl::PROPERTY_ALL,
            Self::PropArray => &sl::PROPERTY_ARRAY,
        })
    }

    #[must_use]
    pub const fn is_case_sensetive(self) -> bool {
        !matches!(
            self,
            Self::Input | Self::Output | Self::Classname | Self::Convar
        )
    }
}
