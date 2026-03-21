local telescope = require("telescope")
local builtin = require("telescope.builtin")

telescope.setup({
  defaults = {
    prompt_prefix = "  ",
    selection_caret = " ",
    path_display = { "smart" },
    sorting_strategy = "ascending",
    layout_config = {
      prompt_position = "top",
    },
  },
  pickers = {
    find_files = {
      hidden = true,
    },
    oldfiles = {
      only_cwd = true,
    },
  },
})

local keymap = vim.keymap.set
local opts = { noremap = true, silent = true }

keymap("n", "<leader>ff", builtin.find_files, opts)
keymap("n", "<leader>fg", builtin.live_grep, opts)
keymap("n", "<leader>fb", builtin.buffers, opts)
keymap("n", "<leader>fr", builtin.oldfiles, opts)
keymap("n", "<leader>fh", builtin.help_tags, opts)
keymap("n", "<leader>fc", builtin.commands, opts)
keymap("n", "<leader>/", builtin.current_buffer_fuzzy_find, opts)
