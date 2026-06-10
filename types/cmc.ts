export type CmcQuoteLatestResponse = {
  data?: {
    BNB?: {
      quote?: {
        USD?: {
          price?: number;
          percent_change_24h?: number;
        };
      };
    };
  };
  status?: {
    error_code?: number;
    error_message?: string | null;
  };
};

export type CmcFearGreedResponse = {
  data?: {
    value?: number | string;
    value_classification?: string;
  };
  status?: {
    error_code?: number;
    error_message?: string | null;
  };
};

export type CmcOhlcvHistoricalResponse = {
  data?: {
    quotes?: Array<{
      time_open?: string;
      time_close?: string;
      quote?: {
        USD?: {
          open?: number;
          high?: number;
          low?: number;
          close?: number;
          volume?: number;
        };
      };
    }>;
  };
  status?: {
    error_code?: number;
    error_message?: string | null;
  };
};
