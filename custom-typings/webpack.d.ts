declare interface WebpackRequire {
    <T>(path: string): T;
}

declare var require: WebpackRequire;