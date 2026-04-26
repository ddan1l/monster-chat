import js from "@eslint/js";
import ts from "typescript-eslint";
import vue from "eslint-plugin-vue";
import prettierPlugin from "eslint-plugin-prettier/recommended";

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
        ignores: ["**/node_modules/**", "**/dist/**"],
    }
);
