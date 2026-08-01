import { describe, expect, it } from "vitest";
import {
  extractVariables,
  missingVariables,
  renderHtml,
  renderText,
} from "./template";

describe("extractVariables", () => {
  it("finds each distinct token across subject and body", () => {
    expect(
      extractVariables("Hi {{dealer_name}}", "Week {{week}}, {{dealer_name}}"),
    ).toEqual(["dealer_name", "week"]);
  });

  it("tolerates whitespace inside the braces", () => {
    expect(extractVariables("{{ week }}")).toEqual(["week"]);
  });
});

describe("renderText", () => {
  it("substitutes known variables", () => {
    expect(renderText("Hello {{dealer_name}}", { dealer_name: "Rich" })).toBe(
      "Hello Rich",
    );
  });

  it("leaves unknown tokens visible so mistakes are caught", () => {
    expect(renderText("Hello {{missing}}", {})).toBe("Hello {{missing}}");
  });

  it("coerces numbers", () => {
    expect(renderText("#{{n}}", { n: 3 })).toBe("#3");
  });
});

describe("renderHtml", () => {
  it("escapes variable values to prevent injection", () => {
    expect(renderHtml("{{x}}", { x: "<script>alert(1)</script>" })).toContain(
      "&lt;script&gt;",
    );
  });

  it("does not escape the trusted template text itself", () => {
    expect(renderHtml("<b>{{name}}</b>", { name: "Rich" })).toContain("<b>Rich</b>");
  });

  it("preserves unknown tokens (e.g. update_button injected later)", () => {
    expect(renderHtml("Go: {{update_button}}", {})).toContain("{{update_button}}");
  });

  it("converts newlines to <br>", () => {
    expect(renderHtml("a\nb", {})).toBe("a<br>\nb");
  });
});

describe("missingVariables", () => {
  it("lists referenced variables that have no value", () => {
    expect(missingVariables("{{a}} {{b}}", { a: "x" })).toEqual(["b"]);
  });
});
