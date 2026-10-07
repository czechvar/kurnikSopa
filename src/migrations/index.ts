import * as migration_20260415_223941 from './20260415_223941';
import * as migration_20260512_230623_add_media_prefix from './20260512_230623_add_media_prefix';
import * as migration_20260513_001033_add_blog_collections from './20260513_001033_add_blog_collections';
import * as migration_20260515_084541 from './20260515_084541';
import * as migration_20260517_060634_phase_3b_cart_orders from './20260517_060634_phase_3b_cart_orders';
import * as migration_20261003_200248_editor_role from './20261003_200248_editor_role';
import * as migration_20261004_201045_posts_drafts from './20261004_201045_posts_drafts';
import * as migration_20261006_230927_launch_commerce from './20261006_230927_launch_commerce';

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
    name: '20260517_060634_phase_3b_cart_orders',
  },
  {
    up: migration_20261003_200248_editor_role.up,
    down: migration_20261003_200248_editor_role.down,
    name: '20261003_200248_editor_role',
  },
  {
    up: migration_20261004_201045_posts_drafts.up,
    down: migration_20261004_201045_posts_drafts.down,
    name: '20261004_201045_posts_drafts',
  },
  {
    up: migration_20261006_230927_launch_commerce.up,
    down: migration_20261006_230927_launch_commerce.down,
    name: '20261006_230927_launch_commerce'
  },
];
