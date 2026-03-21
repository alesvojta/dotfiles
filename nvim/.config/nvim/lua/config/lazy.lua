local lazypath = vim.fn.stdpath("data") .. "/lazy/lazy.nvim"

if not vim.loop.fs_stat(lazypath) then
  vim.fn.system({
    "git",
    "clone",
    "--filter=blob:none",
    "https://github.com/folke/lazy.nvim.git",
    lazypath,
  })
end

vim.opt.rtp:prepend(lazypath)

require("lazy").setup({
  { "nvim-lua/plenary.nvim" },

  {
    "catppuccin/nvim",
    name = "catppuccin",
    priority = 1000,
    config = function()
      require("catppuccin").setup({
        flavour = "macchiato",
        transparent_background = true,

        integrations = {
          nvimtree = true,
          telescope = true,
          gitsigns = true,
          treesitter = true,
          lualine = true,
        },
      })

      vim.cmd.colorscheme("catppuccin-macchiato")
    end,
  },

  {
    "nvim-telescope/telescope.nvim",
    branch = "0.1.x",
    dependencies = { "nvim-lua/plenary.nvim" },
    config = function()
      require("plugins.telescope")
    end,
  },

  {
    "nvim-tree/nvim-tree.lua",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
      require("plugins.tree")
    end,
  },

  {
    "nvim-treesitter/nvim-treesitter",
    build = function()
      pcall(vim.cmd, "TSUpdate")
    end,
    config = function()
      require("plugins.treesitter")
    end,
  },

  {
    "lewis6991/gitsigns.nvim",
    config = function()
      require("plugins.gitsigns")
    end,
  },

  {
    "nvim-lualine/lualine.nvim",
    dependencies = { "nvim-tree/nvim-web-devicons" },
    config = function()
      require("plugins.lualine")
    end,
  },

  {
    "windwp/nvim-autopairs",
    event = "InsertEnter",
    config = function()
      require("plugins.autopairs")
    end,
  },

  {
    "numToStr/Comment.nvim",
    config = function()
      require("plugins.comment")
    end,
  },
}, {
  defaults = {
    lazy = false,
  },
  install = {
    colorscheme = { "habamax" },
  },
  checker = {
    enabled = false,
  },
})
