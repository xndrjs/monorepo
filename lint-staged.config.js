export default {
  "*.{js,cjs,mjs,ts,tsx,json,jsonc,md,yml,yaml}": ["prettier --write"],
  "*.{js,cjs,mjs,ts,tsx,md}": ["eslint --fix"],
};
