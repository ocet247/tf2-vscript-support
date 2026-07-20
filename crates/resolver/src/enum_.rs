use crate::{SymbolId, SymbolTable};

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct EnumData {
    pub symbol: Option<SymbolId>,
    pub members: SymbolTable,
}
