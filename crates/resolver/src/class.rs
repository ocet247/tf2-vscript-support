use crate::{SymbolId, SymbolTable, arena::ClassId};

#[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
pub enum Inherits {
    #[default]
    No,
    YesButUnknown,
    Yes(ClassId),
}

impl From<Inherits> for Option<ClassId> {
    fn from(value: Inherits) -> Self {
        match value {
            Inherits::No | Inherits::YesButUnknown => None,
            Inherits::Yes(id) => Some(id),
        }
    }
}

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct ClassData {
    pub symbol: Option<SymbolId>,
    pub inherits: Inherits,
    pub members: SymbolTable,
}
