use ::line_index::{LineIndex, TextRange, TextSize, WideEncoding, WideLineCol};
use lsp_types::{Position, Range};

use db::{BaseDatabase, File};

pub fn text_size(line_idx: &LineIndex, position: Position) -> Option<TextSize> {
    let wide = WideLineCol {
        line: position.line,
        col: position.character,
    };

    let Some(line_col) = line_idx.to_utf8(WideEncoding::Utf16, wide) else {
        log::error!(
            "Couldn't convert position {position:?} to a text size since it was missing from the line index"
        );
        return None;
    };

    line_idx.offset(line_col)
}

pub fn text_range(line_idx: &LineIndex, range: Range) -> Option<TextRange> {
    Some(TextRange::new(
        text_size(line_idx, range.start)?,
        text_size(line_idx, range.end)?,
    ))
}

pub fn position(line_idx: &LineIndex, offset: TextSize) -> Option<Position> {
    let Some(line_col) = line_idx.try_line_col(offset) else {
        log::error!(
            "Couldn't convert text size {offset:?} to a position since it was missing from the line index"
        );
        return None;
    };

    let wide = line_idx.to_wide(WideEncoding::Utf16, line_col)?;

    Some(Position {
        line: wide.line,
        character: wide.col,
    })
}

pub fn range(line_idx: &LineIndex, range: TextRange) -> Option<Range> {
    Some(Range {
        start: position(line_idx, range.start())?,
        end: position(line_idx, range.end())?,
    })
}

#[salsa::tracked(returns(ref))]
pub fn line_index(db: &dyn BaseDatabase, file: File) -> LineIndex {
    LineIndex::new(file.text(db))
}
