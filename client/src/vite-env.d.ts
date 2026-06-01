/// <reference types="vite/client" />

declare module "@fontsource-variable/*";
declare module "@fontsource/*";

declare module "*.svg?component" {
    import type { DefineComponent } from "vue";
    const component: DefineComponent;
    export default component;
}

declare module "*.svg?url" {
    const url: string;
    export default url;
}
