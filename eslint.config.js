import js from "@eslint/js";
import ts from "typescript-eslint";
import vue from "eslint-plugin-vue";
import prettierPlugin from "eslint-plugin-prettier/recommended";
import importPlugin from "eslint-plugin-import";

export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    ...vue.configs["flat/recommended"],
    prettierPlugin,
    {
        files: ["**/*.vue"],
        languageOptions: {
            parserOptions: {
                parser: ts.parser,
            },
        },
    },
    {
        files: ["**/*.ts", "**/*.vue"],
        plugins: {
            import: importPlugin,
        },
        settings: {
            "import/resolver": {
                typescript: true,
                node: true,
            },
        },
        rules: {
            "import/order": [
                "error",
                {
                    groups: [
                        "builtin", // встроенные модули Node
                        "external", // npm пакеты (vue, vue-router)
                        "internal", // внутренние алиасы
                        "parent", // ../
                        "sibling", // ./
                        "index", // ./index
                        "object",
                        "type",
                    ],
                    pathGroups: [
                        {
                            pattern: "vue",
                            group: "external",
                            position: "before",
                        },
                        {
                            pattern: "vue-router",
                            group: "external",
                        },
                        {
                            pattern: "@app/**",
                            group: "internal",
                            position: "after",
                        },
                        {
                            pattern: "@shared/**",
                            group: "internal",
                            position: "after",
                        },
                        {
                            pattern: "@entities/**",
                            group: "internal",
                            position: "after",
                        },
                        {
                            pattern: "@features/**",
                            group: "internal",
                            position: "after",
                        },
                        {
                            pattern: "@widgets/**",
                            group: "internal",
                            position: "after",
                        },
                        {
                            pattern: "@pages/**",
                            group: "internal",
                            position: "after",
                        },
                    ],
                    pathGroupsExcludedImportTypes: ["builtin"],
                    alphabetize: {
                        order: "asc",
                        caseInsensitive: true,
                    },
                    "newlines-between": "always",
                },
            ],
            "import/newline-after-import": ["error", { count: 1 }],
            "import/no-duplicates": "error",
        },
    },
    {
        ignores: ["**/node_modules/**", "**/dist/**"],
    }
);
