import { describe, expect, it } from "vitest";
import { HEX_COLOR } from "./hexColor";

describe("HEX_COLOR", () => {
  it.each(["#fff", "#FFF", "#ffff", "#f4511d", "#F4511D", "#f4511dcc", "#000000"])(
    "accepts %s",
    (color) => expect(HEX_COLOR.test(color)).toBe(true),
  );

  it.each([
    "",
    "#",
    "#12",
    "#12345",
    "#1234567",
    "#123456789",
    "#ggg",
    "f4511d",
    "red",
    "rgb(0,0,0)",
    " #fff",
    "#fff ",
    "#fff\n",
    "#fff; background:url(x)",
  ])("rejects %j", (color) => expect(HEX_COLOR.test(color)).toBe(false));
});
