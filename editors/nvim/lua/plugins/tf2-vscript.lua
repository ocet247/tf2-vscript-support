return {
    "neovim/nvim-lspconfig",
    config = function()
        vim.filetype.add({
            extension = {
                nut = "tf2vscript"
            }
        })

        vim.lsp.config("tf2_vscript_ls", {
            cmd = {vim.fn.expand("~/.local/share/tf2-vscript-ls/tf2-vscript-ls")},

            cmd_env = {
                RUST_BACKTRACE = "full"
            },

            filetypes = {"tf2vscript"},

            root_markers = {".git"},

            init_options = {
                stdLibPath = vim.fn.expand("~/.local/share/tf2-vscript-ls/vscript_lib"),
                tf2RootPath = ""
            }
        })

        vim.lsp.enable("tf2_vscript_ls")
    end
}
