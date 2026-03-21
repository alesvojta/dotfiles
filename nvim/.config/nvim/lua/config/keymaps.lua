-- Set leader key to space
vim.g.mapleader = " "

local keymap = vim.keymap.set
local opts = { noremap = true, silent = true }

-- Save / quit
keymap("n", "<leader>w", "<cmd>w<CR>", opts)
keymap("n", "<leader>q", "<cmd>q<CR>", opts)
keymap("n", "<leader>x", "<cmd>x<CR>", opts)

-- Clear search highlight
keymap("n", "<leader>h", "<cmd>nohlsearch<CR>", opts)

-- Buffer navigation
keymap("n", "<leader>l", "<cmd>bnext<CR>", opts)
keymap("n", "<leader>k", "<cmd>bprevious<CR>", opts)
keymap("n", "<leader>bd", "<cmd>bdelete<CR>", opts)

-- Better scrolling
keymap("n", "<C-d>", "<C-d>zz", opts)
keymap("n", "<C-u>", "<C-u>zz", opts)
keymap("n", "n", "nzzzv", opts)
keymap("n", "N", "Nzzzv", opts)

-- Window navigation
keymap("n", "<C-h>", "<C-w>h", opts)
keymap("n", "<C-j>", "<C-w>j", opts)
keymap("n", "<C-k>", "<C-w>k", opts)
keymap("n", "<C-l>", "<C-w>l", opts)

-- Resize splits
keymap("n", "<leader>+", "<cmd>resize +3<CR>", opts)
keymap("n", "<leader>-", "<cmd>resize -3<CR>", opts)
keymap("n", "<leader>>", "<cmd>vertical resize +5<CR>", opts)
keymap("n", "<leader><", "<cmd>vertical resize -5<CR>", opts)

-- Move selected lines
keymap("v", "J", ":m '>+1<CR>gv=gv", opts)
keymap("v", "K", ":m '<-2<CR>gv=gv", opts)

-- Keep paste from overwriting default register
keymap("x", "<leader>p", [["_dP]], opts)

-- Quick toggles
keymap("n", "<leader>tw", function()
  vim.opt.wrap = not vim.opt.wrap:get()
end, opts)

keymap("n", "<leader>tn", function()
  vim.opt.relativenumber = not vim.opt.relativenumber:get()
end, opts)

keymap("n", "<leader>tl", function()
  vim.opt.list = not vim.opt.list:get()
end, opts)

-- Open config quickly
keymap("n", "<leader>vc", "<cmd>edit $MYVIMRC<CR>", opts)

-- Source current config without restart
keymap("n", "<leader>vs", "<cmd>source $MYVIMRC<CR>", opts)
