import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Command } from 'commander';
import { StockSyncService } from './sync/stock-sync.service';
import { SyncTarget } from './sync/types';

async function bootstrap() {
    const appContext = await NestFactory.createApplicationContext(AppModule);
    const stockSyncService = appContext.get(StockSyncService);

    const program = new Command();

    program
        .name('stock-sync')
        .description('CLI tool to sync stock from ERP to Makro and WooCommerce')
        .version('1.0.0');

    program
        .command('sync')
        .description('Sync stock to a target channel')
        .requiredOption('--target <target>', 'Target channel (makro|woo)')
        .action(async (options: { target: string }) => {
            const target = options.target as SyncTarget;

            if (target !== 'makro' && target !== 'woo') {
                console.error(`Invalid target: ${target}. Must be 'makro' or 'woo'`);
                await appContext.close();
                process.exit(1);
            }

            try {
                console.log(`Starting sync to ${target}...`);
                if (target === 'makro') {
                    await stockSyncService.syncToMakro();
                }
                if (target === 'woo') {
                    await stockSyncService.syncToWoo();
                }
                console.log('Sync completed successfully');
            } catch (err) {
                console.error('Sync failed:', err);
                process.exit(1);
            } finally {
                await appContext.close();
            }
        });

    program.exitOverride((err) => {
        if (err.code !== 'commander.helpDisplayed') {
            appContext.close().finally(() => {
                process.exit(err.exitCode || 1);
            });
        }
    });

    await program.parseAsync();
}

bootstrap().catch((err) => {
    console.error('Error:', err);
    process.exit(1);
});
