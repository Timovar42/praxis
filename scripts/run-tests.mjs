import { createVitest } from 'vitest/node';

async function run() {
  const ctx = await createVitest('test', {
    config: 'vitest.config.ts',
    watch: false,
  });
  await ctx.start();
  const failed = ctx.state.getFiles().some((f) => f.result?.state === 'fail');
  await ctx.close();
  if (failed) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
