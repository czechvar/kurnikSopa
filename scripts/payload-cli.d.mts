export function expectedMigrationNames(indexSource: string): string[]
export function allMigrationsApplied(expected: string[], applied: string[]): boolean
export function runVerified(script: string, args?: string[]): Promise<void>
