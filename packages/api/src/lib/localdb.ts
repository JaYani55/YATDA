/**
 * Local test database — in-memory store with a Supabase-compatible fluent
 * query builder.  Used when LOCAL_TEST="true" so the whole service can be
 * exercised end-to-end without any Supabase / PostgreSQL connection.
 *
 * Limitations (acceptable for local testing):
 *  - Data is reset on each worker restart (not persisted to disk).
 *  - Only the subset of the Supabase PostgREST API that the routes use is
 *    implemented; complex PostgREST filters are not supported.
 */

export const LOCAL_TEST_USER_ID     = "00000000-0000-0000-0000-000000000001";
export const LOCAL_TEST_WORKSPACE_ID = "00000000-0000-0000-0000-000000000010";

const LOCAL_CONNECTOR_ID = "00000000-0000-0000-0000-000000000099";
const CAT_FE             = "00000000-0000-0000-0000-000000000021";
const CAT_BE             = "00000000-0000-0000-0000-000000000022";
const CAT_DS             = "00000000-0000-0000-0000-000000000023";
const TS                 = "2026-03-13T00:00:00.000Z";
const W                  = LOCAL_TEST_WORKSPACE_ID;
const U                  = LOCAL_TEST_USER_ID;

// ─── Types ────────────────────────────────────────────────────────────────

type Row    = Record<string, unknown>;
type Tables = Record<string, Row[]>;

/** Which column is the single primary key for each table (undefined = composite PK). */
const TABLE_PKS: Record<string, string | undefined> = {
  YATDA_Tickets:               "ticket_id",
  YATDA_Users:                 "user_id",
  YATDA_Workspaces:            "workspace_id",
  YATDA_Categories:            "category_id",
  YATDA_Comments:              "comment_id",
  YATDA_Milestones:            "milestone_id",
  YATDA_Connectors:            "connector_id",
  YATDA_Connector_Credentials: "credential_id",
  YATDA_External_Task_Map:     "map_id",
};

// ─── Seed data ────────────────────────────────────────────────────────────

function buildSeed(): Tables {
  return {
    YATDA_Users: [
      {
        user_id: U, username: "localtest", display_name: "Local Test User",
        avatar_url: null, role: "user", points: 42,
        created_at: TS, updated_at: TS,
      },
    ],

    YATDA_Connectors: [
      {
        connector_id: LOCAL_CONNECTOR_ID, connector_slug: "google-tasks",
        connector_name: "Google Tasks", is_active: true,
      },
    ],

    YATDA_Workspaces: [
      {
        workspace_id: W, name: "Personal (Local Test)",
        description: "Auto-created workspace for local testing",
        owner_id: U, is_personal: true, icon: "🏠",
        created_at: TS, updated_at: TS,
      },
    ],

    YATDA_Workspace_Members: [
      { workspace_id: W, user_id: U, role: "admin", joined_at: TS },
    ],

    YATDA_Categories: [
      { category_id: CAT_FE, workspace_id: W, category_name: "Frontend", category_color: "#3b82f6", category_description: null, created_at: TS, updated_at: TS },
      { category_id: CAT_BE, workspace_id: W, category_name: "Backend",  category_color: "#10b981", category_description: null, created_at: TS, updated_at: TS },
      { category_id: CAT_DS, workspace_id: W, category_name: "Design",   category_color: "#f59e0b", category_description: null, created_at: TS, updated_at: TS },
    ],

    YATDA_Category_Users: [],

    YATDA_Tickets: [
      { ticket_id: "t01", workspace_id: W, category_id: CAT_FE, ticket_name: "Set up Vite project",          ticket_description: "Bootstrap the frontend with Vite + React + TypeScript.", ticket_status: "done",        ticket_points: 3,    ticket_date: "2026-03-01", ticket_due: "2026-03-05", sort_order: 10, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: TS, phase_review_at: TS, phase_done_at: TS },
      { ticket_id: "t02", workspace_id: W, category_id: CAT_BE, ticket_name: "Design database schema",       ticket_description: "ERD for all tables with indexes and RLS policies.",    ticket_status: "done",        ticket_points: 5,    ticket_date: "2026-03-01", ticket_due: "2026-03-06", sort_order: 20, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: TS, phase_review_at: TS, phase_done_at: TS },
      { ticket_id: "t03", workspace_id: W, category_id: CAT_FE, ticket_name: "Implement Kanban view",        ticket_description: "Drag-and-drop columns using dnd-kit.",                  ticket_status: "review",      ticket_points: 8,    ticket_date: "2026-03-07", ticket_due: "2026-03-15", sort_order: 30, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: TS, phase_review_at: TS, phase_done_at: null },
      { ticket_id: "t04", workspace_id: W, category_id: CAT_FE, ticket_name: "Build List view",              ticket_description: "TanStack Table v8 with sortable columns.",              ticket_status: "in_progress", ticket_points: 5,    ticket_date: "2026-03-08", ticket_due: "2026-03-18", sort_order: 40, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: TS, phase_review_at: null,  phase_done_at: null },
      { ticket_id: "t05", workspace_id: W, category_id: CAT_BE, ticket_name: "Hono API auth middleware",     ticket_description: "JWKS-based Supabase JWT verification via jose.",        ticket_status: "in_progress", ticket_points: 5,    ticket_date: "2026-03-10", ticket_due: "2026-03-20", sort_order: 50, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: TS, phase_review_at: null,  phase_done_at: null },
      { ticket_id: "t06", workspace_id: W, category_id: CAT_BE, ticket_name: "Google Tasks two-way sync",    ticket_description: "OAuth2.0 flow + cron trigger for bidirectional sync.",  ticket_status: "assigned",    ticket_points: 13,   ticket_date: "2026-03-12", ticket_due: "2026-03-30", sort_order: 60, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: TS, phase_in_progress_at: null, phase_review_at: null, phase_done_at: null },
      { ticket_id: "t07", workspace_id: W, category_id: CAT_DS, ticket_name: "Dark mode design tokens",      ticket_description: "CSS custom properties for theming.",                    ticket_status: "backlog",     ticket_points: 3,    ticket_date: null,         ticket_due: "2026-04-01", sort_order: 70, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: null, phase_in_progress_at: null, phase_review_at: null, phase_done_at: null },
      { ticket_id: "t08", workspace_id: W, category_id: null,   ticket_name: "Write end-to-end tests",       ticket_description: null,                                                    ticket_status: "backlog",     ticket_points: null, ticket_date: null,         ticket_due: null,         sort_order: 80, created_by: U, created_at: TS, updated_at: TS, phase_backlog_at: TS, phase_assigned_at: null, phase_in_progress_at: null, phase_review_at: null, phase_done_at: null },
    ],

    YATDA_Ticket_Assignees: [
      { ticket_id: "t03", user_id: U, assigned_by: U, assigned_at: TS },
      { ticket_id: "t04", user_id: U, assigned_by: U, assigned_at: TS },
      { ticket_id: "t05", user_id: U, assigned_by: U, assigned_at: TS },
      { ticket_id: "t06", user_id: U, assigned_by: U, assigned_at: TS },
    ],

    YATDA_Milestones:            [],
    YATDA_Comments:              [],
    YATDA_Connector_Credentials: [],
    YATDA_External_Task_Map:     [],
  };
}

// Module-level singleton — persists across requests within a CF worker instance.
let _tables: Tables | null = null;

function getTables(): Tables {
  if (!_tables) _tables = buildSeed();
  return _tables;
}

// ─── Join resolver ────────────────────────────────────────────────────────

function resolveJoins(tableName: string, row: Row, tables: Tables): Row {
  if (tableName === "YATDA_Tickets") {
    const allUsers = tables["YATDA_Users"] ?? [];
    const assignees = (tables["YATDA_Ticket_Assignees"] ?? [])
      .filter((a) => a.ticket_id === row.ticket_id)
      .map((a) => ({
        user_id:     a.user_id,
        assigned_at: a.assigned_at,
        user: allUsers.find((u) => u.user_id === a.user_id) ?? null,
      }));
    const category = row.category_id
      ? (tables["YATDA_Categories"] ?? []).find((c) => c.category_id === row.category_id) ?? null
      : null;
    const comments = (tables["YATDA_Comments"] ?? [])
      .filter((c) => c.ticket_id === row.ticket_id)
      .map((c) => ({
        ...c,
        author: allUsers.find((u) => u.user_id === c.author_user_id) ?? null,
      }));
    return { ...row, assignees, category, comments };
  }

  if (tableName === "YATDA_Workspaces") {
    const memberCount = (tables["YATDA_Workspace_Members"] ?? [])
      .filter((m) => m.workspace_id === row.workspace_id).length;
    return { ...row, member_count: [{ count: memberCount }] };
  }

  if (tableName === "YATDA_Workspace_Members") {
    const user = (tables["YATDA_Users"] ?? []).find((u) => u.user_id === row.user_id) ?? null;
    return { ...row, user };
  }

  if (tableName === "YATDA_Categories") {
    const allUsers = tables["YATDA_Users"] ?? [];
    const assigned_users = (tables["YATDA_Category_Users"] ?? [])
      .filter((cu) => cu.category_id === row.category_id)
      .map((cu) => ({
        user_id: cu.user_id,
        user: allUsers.find((u) => u.user_id === cu.user_id) ?? null,
      }));
    return { ...row, assigned_users };
  }

  return row;
}

// ─── Query builder ────────────────────────────────────────────────────────

type QBResult = { data: unknown; error: null | { message: string } };
type QBAction  = "select" | "insert" | "update" | "delete";

class LocalQueryBuilder {
  private _table: string;
  private _action: QBAction = "select";
  private _filters: Array<[string, unknown]> = [];
  private _orderCol?: string;
  private _orderAsc = true;
  private _isSingle = false;
  private _returnAfterMutate = false;
  private _insertData?: Row | Row[];
  private _updateData?: Row;

  constructor(table: string) {
    this._table = table;
  }

  // ── Terminals / chain starters ──────────────────────────────────────────

  select(_cols?: string): this {
    if (this._action === "insert" || this._action === "update") {
      // Chained after insert/update — means "return the mutated rows"
      this._returnAfterMutate = true;
    } else {
      this._action = "select";
    }
    return this;
  }

  insert(data: Row | Row[]): this {
    this._action     = "insert";
    this._insertData = data;
    return this;
  }

  update(data: Row): this {
    this._action     = "update";
    this._updateData = data;
    return this;
  }

  delete(): this {
    this._action = "delete";
    return this;
  }

  // ── Filters / modifiers ─────────────────────────────────────────────────

  eq(col: string, val: unknown): this {
    this._filters.push([col, val]);
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }): this {
    this._orderCol = col;
    this._orderAsc = opts?.ascending !== false;
    return this;
  }

  single(): this {
    this._isSingle = true;
    return this;
  }

  // ── Execution ────────────────────────────────────────────────────────────

  private _execute(): QBResult {
    const tables = getTables();
    const rows   = tables[this._table] ?? (tables[this._table] = []);

    const matchesFilters = (row: Row) =>
      this._filters.every(([col, val]) => row[col] === val);

    // ── SELECT ──────────────────────────────────────────────────────────
    if (this._action === "select") {
      let result = rows.filter(matchesFilters);

      if (this._orderCol) {
        const col = this._orderCol;
        const asc = this._orderAsc;
        result = [...result].sort((a, b) => {
          const av = a[col] as string | number | null | undefined;
          const bv = b[col] as string | number | null | undefined;
          if (av == null && bv == null) return 0;
          if (av == null) return asc ? 1 : -1;
          if (bv == null) return asc ? -1 : 1;
          // eslint-disable-next-line no-nested-ternary
          return asc ? (av < bv ? -1 : av > bv ? 1 : 0) : (av > bv ? -1 : av < bv ? 1 : 0);
        });
      }

      const withJoins = result.map((r) => resolveJoins(this._table, r, tables));

      if (this._isSingle) {
        if (withJoins.length === 0)
          return { data: null, error: { message: `Row not found in ${this._table}` } };
        return { data: withJoins[0], error: null };
      }
      return { data: withJoins, error: null };
    }

    // ── INSERT ──────────────────────────────────────────────────────────
    if (this._action === "insert") {
      const pkField    = TABLE_PKS[this._table];
      const inputArray = Array.isArray(this._insertData)
        ? this._insertData
        : [this._insertData!];
      const inserted: Row[] = [];

      for (const raw of inputArray) {
        const newRow: Row = {
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ...raw,
        };
        if (pkField && !newRow[pkField]) {
          newRow[pkField] = crypto.randomUUID();
        }
        rows.push(newRow);
        inserted.push(newRow);
      }

      if (this._returnAfterMutate) {
        const withJoins = inserted.map((r) => resolveJoins(this._table, r, tables));
        return {
          data: this._isSingle ? (withJoins[0] ?? null) : withJoins,
          error: null,
        };
      }
      return {
        data: inserted.length === 1 ? inserted[0] : inserted,
        error: null,
      };
    }

    // ── UPDATE ──────────────────────────────────────────────────────────
    if (this._action === "update") {
      const patchData = this._updateData ?? {};
      const ts        = new Date().toISOString();
      let updatedRow: Row | null = null;

      tables[this._table] = rows.map((row) => {
        if (matchesFilters(row)) {
          const updated = { ...row, ...patchData, updated_at: ts };
          updatedRow = updated;
          return updated;
        }
        return row;
      });

      if (this._returnAfterMutate && this._isSingle) {
        return {
          data: updatedRow ? resolveJoins(this._table, updatedRow, tables) : null,
          error: null,
        };
      }
      return { data: null, error: null };
    }

    // ── DELETE ──────────────────────────────────────────────────────────
    if (this._action === "delete") {
      tables[this._table] = rows.filter((row) => !matchesFilters(row));
      return { data: null, error: null };
    }

    return { data: null, error: null };
  }

  // Make instances thenable so `await builder` and destructuring work.
  then<R1 = QBResult, R2 = never>(
    onfulfilled?: ((value: QBResult) => R1 | PromiseLike<R1>) | null,
    onrejected?:  ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): Promise<R1 | R2> {
    return Promise.resolve(this._execute()).then(onfulfilled, onrejected);
  }
}

// ─── Public factory ───────────────────────────────────────────────────────

/**
 * Returns a minimal Supabase-client-shaped object backed by the in-memory
 * store.  Cast to `ReturnType<typeof createClient>` at the call site.
 */
export function buildLocalClient() {
  return {
    from(table: string) {
      return new LocalQueryBuilder(table);
    },
  };
}
