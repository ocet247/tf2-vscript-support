use crate::{SymbolTable, arena::TableId};

#[derive(Default, Debug, Clone, PartialEq, Eq)]
pub struct TableData {
    pub delegate: Option<TableId>,
    pub members: SymbolTable,
}
