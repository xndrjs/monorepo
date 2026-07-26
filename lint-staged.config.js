export default {
  // `.cursor/skills`, `.github/skills`, and `.claude/skills` symlink to `.skills/`.
  ignores: [".cursor/skills/**", ".github/skills/**", ".claude/skills/**"],
  "*.{js,cjs,mjs,ts,tsx,json,jsonc,md,yml,yaml}": ["prettier --write"],
  "*.{js,cjs,mjs,ts,tsx}": ["eslint --fix"],
};
