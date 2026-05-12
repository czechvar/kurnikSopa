import * as migration_20260415_223941 from './20260415_223941';
import * as migration_20260512_230623_add_media_prefix from './20260512_230623_add_media_prefix';

export const migrations = [
  {
    up: migration_20260415_223941.up,
    down: migration_20260415_223941.down,
    name: '20260415_223941',
  },
  {
    up: migration_20260512_230623_add_media_prefix.up,
    down: migration_20260512_230623_add_media_prefix.down,
    name: '20260512_230623_add_media_prefix'
  },
];
