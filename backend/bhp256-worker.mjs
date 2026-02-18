import { AleoNetworkClient } from '@provablehq/sdk';

const input = process.argv[2];
if (!input) {
  console.error('Usage: node bhp256-worker.mjs <field_value>');
  process.exit(1);
}

const key = input.endsWith('field') ? input : `${input}field`;

async function computeHash() {
  try {
    const client = new AleoNetworkClient('https://api.explorer.provable.com/v1/testnet');
    const program = await client.getProgram('credits.aleo');

    const { initThreadPool, ProgramManager, ProvingKey, VerifyingKey, AleoKeyProvider } = await import('@provablehq/sdk');

    await initThreadPool();

    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);

    const pm = new ProgramManager(
      'https://api.explorer.provable.com/v1/testnet',
      keyProvider,
      undefined
    );

    const executeResult = await pm.run(
      `program bhp256_helper.aleo;
function compute:
    input r0 as field.private;
    hash.bhp256 r0 into r1 as field;
    output r1 as field.private;
`,
      'compute',
      [key],
      false,
      [],
      undefined,
      undefined,
      undefined,
      undefined,
    );

    if (executeResult && executeResult.length > 0) {
      const result = executeResult[0];
      console.log(result);
    } else {
      console.error('No output from BHP256 computation');
      process.exit(1);
    }
  } catch (err) {
    console.error('BHP256 compute error:', err.message || err);
    process.exit(1);
  }
}

computeHash();
