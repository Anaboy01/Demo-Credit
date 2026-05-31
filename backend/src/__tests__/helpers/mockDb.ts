type QueryResult = unknown;

interface MockQueryBuilder {
  select: jest.Mock;
  where: jest.Mock;
  orWhere: jest.Mock;
  first: jest.Mock;
  insert: jest.Mock;
  increment: jest.Mock;
  decrement: jest.Mock;
  del: jest.Mock;
  join: jest.Mock;
  forUpdate: jest.Mock;
  clone: jest.Mock;
  count: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
  offset: jest.Mock;
  andWhere: jest.Mock;
  leftJoin: jest.Mock;
  resolveWith: (value: QueryResult) => MockQueryBuilder;
  then: Promise<QueryResult>["then"];
}

const createChain = (overrides: Partial<MockQueryBuilder> = {}): MockQueryBuilder => {
  let resolveValue: QueryResult = [];

  const chain = {} as MockQueryBuilder;

  chain.select = jest.fn().mockReturnValue(chain);
  chain.where = jest.fn().mockReturnValue(chain);
  chain.orWhere = jest.fn().mockReturnValue(chain);
  chain.join = jest.fn().mockReturnValue(chain);
  chain.forUpdate = jest.fn().mockReturnValue(chain);
  chain.clone = jest.fn().mockReturnValue(chain);
  chain.count = jest.fn().mockReturnValue(chain);
  chain.orderBy = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.offset = jest.fn().mockReturnValue(chain);
  chain.andWhere = jest.fn().mockReturnValue(chain);
  chain.leftJoin = jest.fn().mockReturnValue(chain);
  chain.first = jest.fn().mockImplementation(() => Promise.resolve(resolveValue));
  chain.insert = jest.fn().mockResolvedValue(undefined);
  chain.increment = jest.fn().mockResolvedValue(undefined);
  chain.decrement = jest.fn().mockResolvedValue(undefined);
  chain.del = jest.fn().mockResolvedValue(undefined);
  chain.resolveWith = (value: QueryResult) => {
    resolveValue = value;
    return chain;
  };
  chain.then = (onFulfilled, onRejected) =>
    Promise.resolve(resolveValue).then(onFulfilled, onRejected);

  Object.assign(chain, overrides);

  return chain;
};

export const createMockDb = () => {
  const tableHandlers = new Map<string, MockQueryBuilder>();
  const defaultChain = createChain();

  const db = jest.fn((table: string) => {
    return tableHandlers.get(table) ?? defaultChain;
  }) as jest.Mock & {
    transaction: jest.Mock;
    raw: jest.Mock;
    mockTable: (table: string, overrides?: Partial<MockQueryBuilder>) => MockQueryBuilder;
    reset: () => void;
  };

  db.transaction = jest.fn(async (callback: (trx: typeof db) => Promise<void>) => {
    await callback(db);
  });

  db.raw = jest.fn((sql: string) => sql);

  db.mockTable = (table: string, overrides: Partial<MockQueryBuilder> = {}) => {
    const chain = createChain(overrides);
    tableHandlers.set(table, chain);
    return chain;
  };

  db.reset = () => {
    tableHandlers.clear();
    db.mockClear();
    db.transaction.mockClear();
  };

  return db;
};

export type MockDb = ReturnType<typeof createMockDb>;

export const setQueryResult = (
  chain: MockQueryBuilder,
  method: "first" | "resolveWith",
  result: QueryResult
) => {
  if (method === "first") {
    chain.first.mockResolvedValue(result);
    chain.resolveWith(result);
    return;
  }

  chain.resolveWith(result);
};
