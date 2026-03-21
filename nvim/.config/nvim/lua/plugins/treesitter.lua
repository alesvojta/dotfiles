local ok, configs = pcall(require, "nvim-treesitter.configs")
if not ok then
  return
end

configs.setup({
  ensure_installed = {
    "lua",
    "vim",
    "vimdoc",
    "bash",
    "json",
    "yaml",
    "toml",
    "html",
    "css",
    "javascript",
    "typescript",
    "tsx",
    "markdown",
    "markdown_inline",
    "regex",
    "dockerfile",
    "gitignore",
  },
  highlight = {
    enable = true,
  },
  indent = {
    enable = true,
  },
})
