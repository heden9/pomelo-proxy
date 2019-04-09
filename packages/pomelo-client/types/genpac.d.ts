export = GenPAC;
declare class GenPAC {
  static logError(args: any): void;
  static parseRules(rules: any): any;
  static readConfig(configFrom: any): any;
  constructor({
    proxy,
    output,
    gfwlistURL,
    gfwlistProxy,
    gfwlistLocal,
    updateGFWListLocal,
    userRule,
    userRuleFrom,
    configFrom,
    compress,
    base64
  }: Partial<{
    proxy: string;
    output: string;
    gfwlistURL: string;
    gfwlistProxy: string;
    gfwlistLocal: string;
    updateGFWListLocal: string;
    userRule: string[];
    userRuleFrom: string[];
    configFrom: string;
    compress: boolean;
    base64: boolean;
  }>);
  proxy: string;
  output: string;
  gfwlistURL: string;
  gfwlistProxy: string;
  gfwlistLocal: string;
  updateGFWListLocal: string;
  userRule: string[];
  userRuleFrom: string[];
  configFrom: string;
  compress: boolean;
  base64: boolean;
  buildOpener(): Promise<any>;
  fetchGFWList(): Promise<string>;
  fetchUserRules(): string[];
  generate(): void;
  outputPAC(): void;
  startParse(gfwlistRules: any, userRules: any): void;
}
