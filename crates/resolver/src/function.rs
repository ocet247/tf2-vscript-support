use line_index::TextRange;
use sq_3_parser::SyntaxNodePtr;

use crate::{Container, SymbolId, symbol::Type};

#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub enum ParamsState {
    #[default]
    NoDefault,
    Default(usize),
    VarArgs(usize, SymbolId),
}

#[derive(Debug, Clone, PartialEq)]
pub enum FunctionBack {
    Return(Type),
    Yield(Type),
}

impl Default for FunctionBack {
    fn default() -> Self {
        Self::Return(Type::NULL)
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FunctionImpl {
    pub range: TextRange,
    pub node: SyntaxNodePtr,
    pub container: Container,
    pub bindenv: Option<Container>,
    pub flags: FunctionFlags,
}

#[derive(Debug, Default, Clone, PartialEq)]
pub struct FunctionData {
    pub params: Vec<SymbolId>,
    pub params_state: ParamsState,
    pub back: FunctionBack,
    pub throws: Option<Type>,
    pub symbol: Option<SymbolId>,
    pub imp: Option<FunctionImpl>,
}

bitflags::bitflags! {
    #[derive(Debug, Default, Clone, Copy, PartialEq, Eq)]
    pub struct FunctionFlags: u8 {
        // The function body has rerun and replaced this function id with another one
        // Should only be a temporary fix
        const STALE = 1 << 0;
        const NO_DISCARD = 1 << 1;
        const RETURN_EXPLICIT = 1 << 2;
        const YIELD_EXPLICIT = 1 << 3;
        const THROW_EXPLICIT = 1 << 4;
    }
}
