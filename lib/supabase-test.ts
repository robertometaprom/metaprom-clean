import { supabase, isSupabaseConfigured } from './supabase';

type SupabaseTestResult = {
  success: boolean;
  message: string;
  details?: unknown;
};

const SUPABASE_TABLE_TESTS = ['projects', 'libraries', 'profiles', 'users'] as const;

function isMissingRelationError(error: { message?: string; code?: string | number } | null): boolean {
  if (!error?.message) {
    return false;
  }

  return (
    error.message.includes('relation') ||
    error.message.includes('does not exist') ||
    error.message.includes('not found') ||
    error.code === '42P01' ||
    error.code === '42703'
  );
}

export async function testSupabaseConnection(): Promise<SupabaseTestResult> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        'Supabase environment variables are not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    };
  }

  if (!supabase) {
    return {
      success: false,
      message:
        'Supabase client could not be initialized. Verify that NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are valid.',
    };
  }

  try {
    const rpcResponse = await supabase.rpc('version');

    if (!rpcResponse.error) {
      return {
        success: true,
        message: 'Supabase connection successful. Postgres version retrieved via RPC.',
        details: rpcResponse.data,
      };
    }

    for (const table of SUPABASE_TABLE_TESTS) {
      const response = await supabase.from(table).select('id').limit(1);

      if (!response.error) {
        return {
          success: true,
          message: `Supabase connection successful. Read from table "${table}" succeeded.`,
          details: { table, data: response.data },
        };
      }

      if (!isMissingRelationError(response.error)) {
        return {
          success: false,
          message: `Supabase read test failed for table "${table}".`,
          details: response.error,
        };
      }
    }

    return {
      success: true,
      message:
        'Supabase client is configured. Known read-test tables were not available, but the connection was established.',
      details: { testedTables: SUPABASE_TABLE_TESTS },
    };
  } catch (error) {
    return {
      success: false,
      message: 'Supabase connection test encountered an unexpected error.',
      details: error,
    };
  }
}

export type { SupabaseTestResult };
