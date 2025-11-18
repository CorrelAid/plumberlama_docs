import type { LiveLoader } from 'astro/loaders';
import pg from "@/db.ts";

const table_prefix = import.meta.env.SURVEY_ID;

// Build identifier objects for postgres tagged template
const metadataTable      = pg(`${table_prefix}_metadata`);
const distributionsTable = pg(`${table_prefix}_distributions`);
const categoricalTable   = pg(`${table_prefix}_categorical`);

interface Variable {
  question_id: number;
  group_id: number;
  id: string;
  question_position: number;
  question_type: string;
  schema_variable_type: string;
  question_text: string;
  label: string | null;
  range_min: number | null;
  range_max: number | null;
  possible_values_codes: string[] | null;
  possible_values_labels: string;
  scale_labels: string[] | null;
  is_other_boolean: boolean;
  is_other_text: boolean;
  validation_warning: string | null;
  original_id?: string;
  anonymization_type: string;
}

interface Distribution {
  variable_id: string;
  values: number[];
  load_counter: number;
  n: number;
  mean: number | null;
  median: number | null;
  std_dev: number | null;
  min: number | null;
  max: number | null;
}

/**
 * variableLoader: unchanged behaviour - returns metadata rows
 */
export function variableLoader(config: { apiKey: string }): LiveLoader<Variable> {
  return {
    name: 'variableLoader',
    loadCollection: async () => {
      try {
        const rows = await pg`SELECT * FROM ${metadataTable}`;

        return {
          entries: rows.map((variables: any) => ({
            id: variables.id,
            data: variables,
          })),
        };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load variables: ${error.message}`),
        };
      }
    },
    loadEntry: async ({ filter }) => {
      try {
        const [row] = await pg`
          SELECT * FROM ${metadataTable}
          WHERE id = ${filter.id}
        `;

        if (!row) {
          return {
            error: new Error('Variable not found'),
          };
        }

        return {
          id: row.id,
          data: row as any,
        };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load variable: ${error.message}`),
        };
      }
    },
  };
}

const toNumberOrNull = (v: any): number | null =>
  v === null || v === undefined ? null : Number(v);

function rowToDistribution(r: any): Distribution {
  const valuesArray: number[] = (r.values ?? [])
    .map((x: any) =>
      x === null ? NaN : typeof x === 'number' ? x : Number(x),
    )
    .filter(Number.isFinite);

  return {
    variable_id: r.variable_id,
    values: valuesArray,
    load_counter: Number(r.load_counter ?? 0),
    n: Number(r.n ?? 0),
    mean: toNumberOrNull(r.mean),
    median: toNumberOrNull(r.median),
    std_dev: toNumberOrNull(r.std_dev),
    min: toNumberOrNull(r.min),
    max: toNumberOrNull(r.max),
  };
}

async function queryAllgroupBys(): Promise<any[]> {
  return (await pg`
    SELECT
      variable_id,
      COUNT(value) FILTER (WHERE value IS NOT NULL) AS n,
      ROUND(AVG((value::double precision))::numeric, 2) AS mean,
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value::double precision)::numeric,
        2
      ) AS median,
      ROUND(STDDEV_SAMP(value::double precision)::numeric, 2) AS std_dev,
      MIN(value::double precision) AS min,
      MAX(value::double precision) AS max,
      SUM(load_counter) AS load_counter,
      array_agg(value::double precision) FILTER (WHERE value IS NOT NULL) AS values
    FROM ${distributionsTable}
    GROUP BY variable_id
  `) as any[];
}

async function querygroupByFor(variableId: string): Promise<any[]> {
  return (await pg`
    SELECT
      variable_id,
      COUNT(value) FILTER (WHERE value IS NOT NULL) AS n,
      ROUND(AVG((value::double precision))::numeric, 2) AS mean,
      ROUND(
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY value::double precision)::numeric,
        2
      ) AS median,
      ROUND(STDDEV_SAMP(value::double precision)::numeric, 2) AS std_dev,
      MIN(value::double precision) AS min,
      MAX(value::double precision) AS max,
      SUM(load_counter) AS load_counter,
      array_agg(value::double precision) FILTER (WHERE value IS NOT NULL) AS values
    FROM ${distributionsTable}
    WHERE variable_id = ${variableId}
    GROUP BY variable_id
  `) as any[];
}

export function distributionLoader(_config: { apiKey: string }): LiveLoader<Distribution> {
  return {
    name: 'distributionLoader',

    loadCollection: async () => {
      try {
        const rows = await queryAllgroupBys();
        const entries = rows.map((r) => ({
          id: r.variable_id,
          data: rowToDistribution(r),
        }));

        return { entries };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load distributions: ${error.message}`),
        };
      }
    },

    loadEntry: async ({ filter }: { filter: { id: string } }) => {
      try {
        const [variableId] = (filter.id as string).split('_');
        const rows = await querygroupByFor(variableId);

        if (!rows || rows.length === 0) {
          return { error: new Error('Distribution not found') };
        }

        const distribution = rowToDistribution(rows[0]);

        return {
          id: filter.id as string,
          data: distribution,
        };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load distribution: ${error.message}`),
        };
      }
    },
  };
}

interface Categorical {
  variable_id: string;
  value: string;
  count: number;
  load_counter: number;
}

interface CategoricalData {
  variable_id: string;
  categories: Array<{
    value: string;
    count: number;
  }>;
  total_count: number;
}

async function queryAllCategorical(): Promise<any[]> {
  return (await pg`
    SELECT
      variable_id,
      value,
      SUM(CAST(count AS BIGINT)) as count
    FROM ${categoricalTable}
    WHERE value IS NOT NULL
    GROUP BY variable_id, value
    ORDER BY variable_id, count DESC
  `) as any[];
}

async function queryCategoricalFor(variableId: string): Promise<any[]> {
  return (await pg`
    SELECT
      variable_id,
      value,
      SUM(CAST(count AS BIGINT)) as count
    FROM ${categoricalTable}
    WHERE variable_id = ${variableId} AND value IS NOT NULL
    GROUP BY variable_id, value
    ORDER BY count DESC
  `) as any[];
}

function rowsToCategoricalData(rows: any[]): CategoricalData {
  if (!rows || rows.length === 0) {
    return {
      variable_id: '',
      categories: [],
      total_count: 0,
    };
  }

  const categories = rows.map((r) => ({
    value: String(r.value),
    count: Number(r.count) || 0,
  }));

  const total_count = categories.reduce((sum, cat) => sum + cat.count, 0);

  return {
    variable_id: rows[0].variable_id,
    categories,
    total_count,
  };
}

export function categoricalLoader(_config: { apiKey: string }): LiveLoader<CategoricalData> {
  return {
    name: 'categoricalLoader',

    loadCollection: async () => {
      try {
        const rows = await queryAllCategorical();

        const byVariable = new Map<string, any[]>();
        for (const row of rows) {
          const varId = row.variable_id;
          if (!byVariable.has(varId)) {
            byVariable.set(varId, []);
          }
          byVariable.get(varId)!.push(row);
        }

        const entries = Array.from(byVariable.entries()).map(
          ([varId, varRows]) => ({
            id: varId,
            data: rowsToCategoricalData(varRows),
          }),
        );

        return { entries };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load categorical data: ${error.message}`),
        };
      }
    },

    loadEntry: async ({ filter }: { filter: { id: string } }) => {
      try {
        const rows = await queryCategoricalFor(filter.id as string);

        if (!rows || rows.length === 0) {
          return { error: new Error('Categorical data not found') };
        }
        return {
          id: filter.id as string,
          data: rowsToCategoricalData(rows),
        };
      } catch (error: any) {
        return {
          error: new Error(`Failed to load categorical data: ${error.message}`),
        };
      }
    },
  };
}