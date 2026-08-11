import { describe, it, expect } from "vitest";
import { encodeFunctionData } from "viem";
import { lazyAbi } from "../lib/contracts.js";

describe("lazyAbi Proxy", () => {
  it("should work with Array methods (filter, in operator, find) and viem encodeFunctionData", () => {
    const userAbi = lazyAbi("user-registry");

    expect(Array.isArray(userAbi)).toBe(true);
    expect(userAbi.length).toBeGreaterThan(0);
    expect(0 in userAbi).toBe(true);

    const filtered = userAbi.filter((item: any) => item.name === "registerUser");
    expect(filtered.length).toBe(1);

    const calldata = encodeFunctionData({
      abi: userAbi,
      functionName: "registerUser",
      args: ["testuser"],
    });

    expect(calldata).toBeDefined();
    expect(typeof calldata).toBe("string");
    expect(calldata.startsWith("0x")).toBe(true);
  });
});
