module.exports = {
  root: true,

  extends: ['@metamask/eslint-config'],

  overrides: [
    {
      files: ['*.js'],
      parserOptions: {
        sourceType: 'script',
      },
      extends: ['@metamask/eslint-config-nodejs'],
    },
    {
      files: ['*.d.ts'],
      extends: ['@metamask/eslint-config-typescript'],
      parserOptions: {
        sourceType: 'script',
      },
    },
  ],

  ignorePatterns: ['!.eslintrc.js', '!.prettierrc.js'],
};
