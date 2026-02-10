import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
    globalIgnores(['dist']),
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 2020,
            globals: {
                ...globals.browser,
                ...globals.jest, // [1] Keeps Jest happy for your testing strategy
            },
            parserOptions: {
                ecmaVersion: 'latest',
                ecmaFeatures: { jsx: true },
                sourceType: 'module',
            },
        },
        settings: {
            react: {
                version: '18.3',
            },
        },
        plugins: {
            react,
            'react-hooks': reactHooks,
            'react-refresh': reactRefresh,
            prettier,
        },
        rules: {
            // 1. Load Base Rules
            ...js.configs.recommended.rules,
            ...react.configs.recommended.rules,
            ...react.configs['jsx-runtime'].rules,
            ...reactHooks.configs.recommended.rules,

            // 2. Disable Conflicting ESLint Formatting Rules
            // This effectively turns off ESLint's opinions on indentation, quotes, etc.
            ...prettierConfig.rules,

            // 3. Enforce Prettier & Custom Logic
            // This runs Prettier as an ESLint rule using your .prettierrc settings
            'prettier/prettier': 'error',

            'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

            // Standard practice: Warn on unused vars, ignore things like "React" or "_temp"
            'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
        },
    },
]);
