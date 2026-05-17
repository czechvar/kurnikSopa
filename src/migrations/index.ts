import * as migration_20260415_223941 from './20260415_223941';
import * as migration_20260512_230623_add_media_prefix from './20260512_230623_add_media_prefix';
import * as migration_20260513_001033_add_blog_collections from './20260513_001033_add_blog_collections';
import * as migration_20260515_084541 from './20260515_084541';
import * as migration_20260517_060634_phase_3b_cart_orders from './20260517_060634_phase_3b_cart_orders';

export const migrations = [
  {
    up: migration_20260415_223941.up,
    down: migration_20260415_223941.down,
    name: '20260415_223941',
  },
  {
    up: migration_20260512_230623_add_media_prefix.up,
    down: migration_20260512_230623_add_media_prefix.down,
    name: '20260512_230623_add_media_prefix',
  },
  {
    up: migration_20260513_001033_add_blog_collections.up,
    down: migration_20260513_001033_add_blog_collections.down,
    name: '20260513_001033_add_blog_collections',
  },
  {
    up: migration_20260515_084541.up,
    down: migration_20260515_084541.down,
    name: '20260515_084541',
  },
  {
    up: migration_20260517_060634_phase_3b_cart_orders.up,
    down: migration_20260517_060634_phase_3b_cart_orders.down,
    name: '20260517_060634_phase_3b_cart_orders'
  },
];
