// __mocks__/supabase.ts

type MockReturn = { data: any; error: any };

const defaults: MockReturn = { data: null, error: null };
let nextReturn: MockReturn = { ...defaults };

function chainable(): any {
  const proxy: any = new Proxy(
    {},
    {
      get(_target, prop) {
        // Terminal methods return the mock result
        if (prop === "single" || prop === "then") {
          const result = { ...nextReturn };
          nextReturn = { ...defaults };
          if (prop === "single") return () => Promise.resolve(result);
          return (resolve: any) => resolve(result);
        }
        // Everything else returns the chainable proxy
        return (..._args: any[]) => chainable();
      },
    }
  );
  return proxy;
}

export const supabase = {
  from: (_table: string) => chainable(),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
};

/** Call before a test to set what the next Supabase query returns. */
export function __setMockReturn(data: any, error: any = null) {
  nextReturn = { data, error };
}
