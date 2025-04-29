export const DDH_ABI = [
  {
    inputs: [
      { name: "factory", type: "address" },
      { name: "masterCopy", type: "address" },
      { name: "initParams", type: "bytes" },
      { name: "saltNonce", type: "uint256" },
      { name: "realityOracle", type: "address" },
      { name: "templateContent", type: "string" },
      { name: "finalModuleOwner", type: "address" },
    ],
    name: "deployWithEncodedParams",
    outputs: [{ name: "realityModuleProxy", type: "address" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
