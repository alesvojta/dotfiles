require("nvim-tree").setup({
  sort_by = "case_sensitive",
  view = {
    width = 32,
    relativenumber = true,
  },
  renderer = {
    group_empty = true,
    icons = {
      show = {
        git = true,
        folder = true,
        file = true,
        folder_arrow = true,
      },
    },
  },
  filters = {
    dotfiles = false,
  },
  git = {
    ignore = false,
  },
  update_focused_file = {
    enable = true,
    update_root = false,
  },
})

vim.keymap.set("n", "<leader>e", "<cmd>NvimTreeToggle<CR>", { noremap = true, silent = true })
vim.keymap.set("n", "<leader>o", "<cmd>NvimTreeFocus<CR>", { noremap = true, silent = true })
