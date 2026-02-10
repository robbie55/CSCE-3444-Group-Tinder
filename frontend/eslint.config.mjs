import js from '@eslint/js';
import globals from 'globals';

export default [
    js.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-var': 'error', // Bans 'var' (Red Squiggle)
            'prefer-const': 'warn', // Suggests 'const' where possible
            'no-unused-vars': 'warn', // Yellow Squiggle for unused variables
        },
    },
];
