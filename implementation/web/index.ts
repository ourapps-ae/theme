// The entry module of theme's web code: everything code outside the component may use.
import "./theme.css";
export { default as themes } from "./themes.json" with { type: "json" };
export * from "./tokens.ts";
export * from "./background.ts";
