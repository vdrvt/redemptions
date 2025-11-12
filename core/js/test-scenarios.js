export const SCENARIOS = [
  // ------- MID sources -------
  {
    id: "mid_url",
    label: "MID via URL (?mid=)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAURLMID1234567890" });
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true }
  },
  {
    id: "mid_dl",
    label: "MID via dataLayer (member_partner_key)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({});
      env.dataLayerPush({ member_partner_key: "BADLMEMBER12345678" });
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true }
  },
  {
    id: "mid_cookie",
    label: "MID via cookie (bondai_mid)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({});
      env.setCookie("bondai_mid", "BACOOKIE1234567890", 30);
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true }
  },
  {
    id: "mid_storage",
    label: "MID via localStorage (bondai_mid)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({});
      env.setStorage("bondai_mid", "BASTORAGE12345678A");
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true }
  },
  {
    id: "mid_missing",
    label: "MID missing",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({});
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: false }
  },
  {
    id: "mid_malformed",
    label: "MID malformed",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "NOT_A_VALID_MID" });
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true }
  },

  // ------- Amount sources -------
  {
    id: "amt_dl",
    label: "Totals via dataLayer",
    attrs: { "data-bondai-amount-dlv": "transactionTotal", "data-bondai-discount-dlv": "totalDiscounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAAMTDL1234567890" });
      env.dataLayerPush({ event: "purchase", transactionTotal: 79.99, totalDiscounts: 10.0 });
    },
    expect: { expectOk: true, expectAmountMin: 79.99, expectDiscountMax: 10.0 }
  },
  {
    id: "amt_dom_ids",
    label: "Totals via DOM IDs",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAAMTDOM1234567890" });
      env.ensureDOMIds();
      env.setDOMTotals("$79.99", "$10.00");
    },
    expect: { expectOk: true, expectAmountMin: 79.99, expectDiscountMax: 10.0 }
  },
  {
    id: "amt_dom_heuristic",
    label: "Totals via DOM heuristic (no selectors)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAHEURIS1234567890" });
      env.removeDOMIds();
      env.injectHeuristicTotals({ total: "USD 1,234.56", discount: "USD 34.56" });
    },
    expect: { expectOk: true, expectAmountMin: 1234.56, expectDiscountMax: 34.56 }
  },

  // ------- Timing -------
  {
    id: "timing_dl_late",
    label: "dataLayer purchase pushed late",
    attrs: { "data-bondai-amount-dlv": "transactionTotal", "data-bondai-discount-dlv": "totalDiscounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BATIMINGDL12345678" });
      setTimeout(() => env.dataLayerPush({ event: "purchase", transactionTotal: 79.99, totalDiscounts: 10.0 }), 400);
    },
    expect: { expectOk: true, expectAmountMin: 79.99, expectDiscountMax: 10.0 }
  },
  {
    id: "timing_dom_late",
    label: "DOM totals appear late",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BATIMINGDOM1234567" });
      env.ensureDOMIds();
      env.setDOMTotals("", "");
      setTimeout(() => env.setDOMTotals("$79.99", "$10.00"), 700);
    },
    expect: { expectOk: true, expectAmountMin: 79.99, expectDiscountMax: 10.0 }
  },

  // ------- Formats -------
  {
    id: "fmt_us",
    label: "US format 1,234.56",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAFMTUS1234567890" });
      env.ensureDOMIds();
      env.setDOMTotals("$1,234.56", "$10.00");
    },
    expect: { expectOk: true, expectAmountMin: 1234.56, expectDiscountMax: 10.0 }
  },
  {
    id: "fmt_eu",
    label: "EU format 1.234,56 €",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAFMTEU1234567890" });
      env.ensureDOMIds();
      env.setDOMTotals("1.234,56 €", "10,00 €");
    },
    expect: { expectOk: true, expectAmountMin: 1234.56, expectDiscountMax: 10.0 }
  },
  {
    id: "fmt_space",
    label: "Spaced 12 345,67 €",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAFMTSPACE12345678" });
      env.ensureDOMIds();
      env.setDOMTotals("12 345,67 €", "345,67 €");
    },
    expect: { expectOk: true, expectAmountMin: 12345.67, expectDiscountMax: 345.67 }
  },

  // ------- Edges -------
  {
    id: "edge_zero_disc",
    label: "Zero discount",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAZERODISC12345678" });
      env.ensureDOMIds();
      env.setDOMTotals("$79.99", "0");
    },
    expect: { expectOk: true, expectAmountMin: 79.99, expectDiscountMax: 0 }
  },
  {
    id: "edge_disc_gt_amt",
    label: "Discount greater than amount (cap)",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BADISCOVER12345678" });
      env.ensureDOMIds();
      env.setDOMTotals("$10.00", "$15.00");
    },
    expect: { expectOk: true, expectAmountMin: 10.0, expectDiscountMax: 10.0 }
  },
  {
    id: "edge_huge",
    label: "Very large amount",
    attrs: { "data-bondai-total-selector": "#order-total", "data-bondai-discount-selector": "#order-discounts" },
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAHUGEAMOUNT123456" });
      env.ensureDOMIds();
      env.setDOMTotals("$123,456,789.99", "$456.78");
    },
    expect: { expectOk: true, expectAmountMin: 123456789.99, expectDiscountMax: 456.78 }
  },

  // ------- Failures -------
  {
    id: "fail_invalid_key",
    label: "Invalid API key",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAINVALIDKEY123456" });
      env.ensureDOMIds();
      env.setDOMTotals("$79.99", "$10.00");
      env.setKey("INVALID_KEY");
    },
    expect: { expectOk: false }
  },
  {
    id: "fail_network",
    label: "Network error (bad URL)",
    prime: async (env) => {
      env.resetAll();
      env.setURLQuery({ mid: "BAFAILNETERR123456" });
      env.ensureDOMIds();
      env.setDOMTotals("$79.99", "$10.00");
      env.setApiUrlOverride("https://invalid.host.dns.tld/nowhere");
    },
    expect: { expectOk: false }
  }
];


