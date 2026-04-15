import * as migration_20260415_223941 from './20260415_223941';

export const migrations = [
  {
    up: migration_20260415_223941.up,
    down: migration_20260415_223941.down,
    name: '20260415_223941'
  },
];
