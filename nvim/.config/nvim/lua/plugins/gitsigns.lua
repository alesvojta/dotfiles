require("gitsigns").setup({
  signs = {
    add = { text = "│" },
    change = { text = "│" },
    delete = { text = "_" },
    topdelete = { text = "‾" },
    changedelete = { text = "~" },
  },
  current_line_blame = false,
})

local gs = package.loaded.gitsigns
local keymap = vim.keymap.set
local opts = { noremap = true, silent = true }

keymap("n", "]c", function()
  if vim.wo.diff then
    vim.cmd.normal({ "]c", bang = true })
  else
    gs.nav_hunk("next")
  end
end, opts)

keymap("n", "[c", function()
  if vim.wo.diff then
    vim.cmd.normal({ "[c", bang = true })
  else
    gs.nav_hunk("prev")
  end
end, opts)

keymap("n", "<leader>gp", gs.preview_hunk, opts)
keymap("n", "<leader>gr", gs.reset_hunk, opts)
keymap("n", "<leader>gb", gs.toggle_current_line_blame, opts)
