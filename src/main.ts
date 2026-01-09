import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Command } from 'commander';
import { StockSyncService } from './sync/stock-sync.service';
import { SyncMode, SyncTarget } from './sync/types';

async function bootstrap() {
    const app = await NestFactory.createApplicationContext(AppModule);
    const syncService = app.get(StockSyncService);

    const program = new Command();

    program
        .name('stock-sync')
        .description('Sync stock from ERP to Makro or WooCommerce')
        .version('1.0.0');

    program
        .command('sync')
        .requiredOption('--target <target>', 'makro | woo')
        .option('--mode <mode>', 'full | incremental', 'full')
        .option('--workers <workers>', 'total workers', '1')
        .option('--worker <worker>', 'worker id (0-indexed)', '0')
        .action(async ({ target, mode, workers, worker }) => {
            const validTargets: SyncTarget[] = ['makro', 'woo'];
            const validModes: SyncMode[] = ['full', 'incremental'];

            const totalWorkers = Number(workers);
            const workerId = Number(worker);

            const exitWithError = async (message: string) => {
                console.error(message);
                await app.close();
                process.exit(1);
            };

            if (!validTargets.includes(target as SyncTarget)) {
                return exitWithError(`Invalid target: ${target}`);
            }

            if (!validModes.includes(mode as SyncMode)) {
                return exitWithError(`Invalid mode: ${mode}`);
            }

            if (totalWorkers < 1 || workerId < 0 || workerId >= totalWorkers) {
                return exitWithError('Invalid worker configuration');
            }

            try {
                console.log(
                    `Starting ${mode} sync to ${target}` +
                        (totalWorkers > 1
                            ? ` (worker ${workerId + 1}/${totalWorkers})`
                            : ''),
                );

                if (target === 'makro') {
                    await syncService.syncToMakro(
                        mode as SyncMode,
                        100,
                        totalWorkers,
                        workerId,
                    );
                } else {
                    await syncService.syncToWoo(
                        mode as SyncMode,
                        100,
                        totalWorkers,
                        workerId,
                    );
                }

                console.log('Sync completed');
            } catch (err: unknown) {
                console.error('Sync failed:', err);
                process.exit(1);
            } finally {
                await app.close();
            }
        });

    await program.parseAsync();
}

bootstrap().catch((err: unknown) => {
    console.error(err);
    process.exit(1);
});
